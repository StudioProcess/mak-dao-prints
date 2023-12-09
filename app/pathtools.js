
// Parse SVG path to a structured format
function parse_path(d) {
    const verbs = "MLCZ"; // supported path verbs
    const unsupported = [ ...d.matchAll(new RegExp(`[^${verbs}\\d .,]`,'g')) ];
    
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

export { parse_path, join_path, matrix, transform_path, clip, clip_multiple };