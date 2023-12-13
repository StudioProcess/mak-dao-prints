
// Parse SVG path to a structured format
function parse_path(d) {
    const verbs = "MmLlCcZz"; // supported path verbs
    const unsupported = [ ...d.matchAll(new RegExp(`[^${verbs}\\d .,-]`,'g')) ];
    
    for (let x of unsupported) {
        console.warn(`Unsupported SVG path verb ${x} at position ${x.index}`)
    }
    
    const parts = d.split(new RegExp(`([${verbs}])`, 'g'));
    const out = [];
    let cmd = [null, null];
    for (let p of parts) {
        if (p === '') {
            /* nop */ 
        } else if (verbs.includes(p)) {
            cmd[0] = p;
        } else {
            cmd[1] = p.split(/[, ]/g).map(x => x.trim()).filter(x => x.length > 0).map(parseFloat);
            out.push(cmd);
            cmd = [null, null];
        }
    }
    return out;
}


function limit_decimals(decimals = null) {
    if (decimals === null || decimals < 0) { return x => x; }
    return function(num) {
        return +num.toFixed(decimals);
    };
}

// Inverse to parse_path
function join_path(p, decimals = null) {
    let out = '';
    const trim = limit_decimals(decimals);
    for (let cmd of p) {
        out += `${cmd[0]} ${cmd[1].map(trim).join(' ')} `;
    }
    out = out.trim();
    return out;
}


// simple matrix construction and point list transformation
function matrix() {
    const m = new DOMMatrix();
    return {
        matrix: m,
        get array() {
            return [m.a, m.b, m.c, m.d, m.e, m.f];
        },
        translate(x, y) {
            m.translateSelf(x, y);
            return this;
        },
        rotate(a) {
            m.rotateSelf(a);
            return this;
        },
        scale(x, y) {
            m.scaleSelf(x, y);
            return this;
        },
        // takes an array of repeating x, y coordinates
        transform(a) {
            if (a.length < 2) { return a; }
            const out = [];
            for (let i = 1; i < a.length; i+=2) {
                const p = m.transformPoint({ x: a[i-1], y: a[i] });
                out.push(p.x, p.y);
            }
            return out;
        }
    };
}

function transform_path(d, matrix, decimals = null) {
    const p = parse_path(d);
    const t = []; // transformed
    for (let [verb, args] of p) {
        t.push( [verb, matrix.transform(args) ] );
    }
    return join_path(t, decimals);
}

// Return d clipped by clip_d. Returns an array of path data strings.
// Supports only single open paths for d.
// Requires paper.js in global scope.
function clip(d, clip_d) {
    let p = new paper.Path(d);
    const clip = new paper.CompoundPath(clip_d);

    // no intersection
    if (!p.intersects(clip)) {
        // inside or outside?
        if (p.isInside(clip.bounds)) {
            // console.log('inside');
            return [];
        } else {
            // console.log('outside');
            return [d];
        }
    }
    const out = [];
    const first_loc = p.getLocationAt(0);
    const last_loc = p.getLocationAt(p.length);
    const stops = [first_loc, ...p.getCrossings(clip), last_loc];
    let inside = clip.contains(first_loc.point);
    for (let i = 1; i < stops.length; i++) {
        const rest = p.splitAt(stops[i]); // p is now shorter
        if (!inside) {
            out.push(p.pathData);
        }
        p = rest;
        inside = !inside;
    }
    return out;
}

function clip_multiple(ds, clip_d) {
    const out = [];
    for (let d of ds) {
        const clipped = clip(d, clip_d);
        out.push(...clipped);
    }
    return out;
}

function flip_line(line) {
    return [ line[2], line[3], line[0], line[1] ];
}

function hatch_pattern(bbox, spacing, angle) {
    // shift pattern slightly to the right and down to prevent wrong intersection calculations
    // suspicion: wrong calculations happen when pattern line exactly hits a control point
    const DELTA = 1e-5;
    let lines = [];

    function transform_line(line, matrix) {
        const p1 = matrix.transformPoint(new DOMPoint(line[0], line[1]));
        const p2 = matrix.transformPoint(new DOMPoint(line[2], line[3]));
        return [p1.x, p1.y, p2.x, p2.y];
    }

    // side length of patterns
    const a = Math.sqrt(bbox[2] ** 2 + bbox[3] ** 2);
    // console.log(a);

    // center of pattern
    const cx = bbox[0] + bbox[2] / 2 + DELTA;
    const cy = bbox[1] + bbox[3] / 2 + DELTA;

    // center line
    lines.push([cx - a / 2, cy, cx + a / 2, cy]);
    // work outwards
    let r = spacing;
    let flip = true;
    while (r < a / 2) {
        let front = [cx - a / 2, cy - r, cx + a / 2, cy - r];
        let back  = [cx - a / 2, cy + r, cx + a / 2, cy + r];
        if (flip) {
            front = flip_line(front);
            back  = flip_line(back);
        }
        lines.unshift(front); // add to front of list
        lines.push(back); // add to end of list
        r += spacing;
        flip = !flip;
    }

    // apply rotation
    const m = new DOMMatrix(); // identity
    m.translateSelf(cx, cy).rotateSelf(angle).translateSelf(-cx, -cy);
    lines = lines.map(l => transform_line(l, m));
    return lines;
}

function line_to_path(l, decimals = null) {
    const trim = limit_decimals(decimals);
    return `M ${trim(l[0])} ${trim(l[1])} L ${trim(l[2])} ${trim(l[3])}`.trim();
}

function lines_to_path(lines, decimals = null) {
    return lines.map(x => line_to_path(x, decimals)).join(' ');
}

// Vector from two points
function vec(x1, y1, x2, y2) {
    return [ x2-x1, y2-y1 ];
}

// Length of a vector
function vec_len([x, y]) {
    return Math.sqrt( x**2 + y**2 );
}

// Normalize vector to given length
function vec_norm([x, y], target_len = 1) {
    const len = vec_len([x, y]);
    return [ x/len*target_len, y/len*target_len ];
}

// Returns array of lines [x1, y1, x2, y2] or pathdata string if return_path == true
function hatch(d, spacing, angle, shorten = 0, return_path = false, decimals = null) {
    const p = new paper.CompoundPath(d);
    const bbox = [p.bounds.x, p.bounds.y, p.bounds.width, p.bounds.height];

    const lines = hatch_pattern(bbox, spacing, angle);
    let out = [];
    for (let l of lines) {
        const pline = new paper.Path.Line(...l)
        const inter = pline.getCrossings(p);
        for (let i = 1; i < inter.length; i += 2) {
            const a = inter[i - 1];
            const b = inter[i];
            out.push([a.point.x, a.point.y, b.point.x, b.point.y]);
        }
    }
    if (shorten > 0) {
        const out2 = [];
        for (let line of out) {
            let v = vec(...line);
            const a = vec_len(v);
            // console.log(line, v, a);
            if (a > 2*shorten) { // line will not get shortened to nothing
                v = [ v[0]/a*shorten, v[1]/a*shorten ];
                out2.push([ line[0]+v[0], line[1]+v[1], line[2]-v[0], line[3]-v[1] ]);
            }
        }
        out = out2;
    }
    if (return_path) {
        return lines_to_path(out, decimals);
    }
    return out;
}

// points is an array of [x,y]
// Returns: [left, top, right, bottom]
function bbox(points) {
    let l = Infinity, t = Infinity, r = 0, b = 0;
    for (let [x, y] of points) {
        if (x < l) { l = x; }
        if (x > r) { r = x; }
        if (y < t) { t = y; }
        if (y > b) { b = y; }
    }
    return [l, t, r, b];
}
// points is an array of [x,y]
// Returns: [avg_x, avg_y]
function avg(points) {
    let ax = 0, ay = 0;
    for (let [x, y] of points) {
        ax += x;
        ay += y;
    }
    ax /= points.length;
    ay /= points.length;
    return [ax, ay];
}


export { parse_path, join_path, matrix, transform_path, clip, clip_multiple, hatch, bbox, avg };