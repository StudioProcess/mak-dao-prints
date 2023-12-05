import * as lil from '../node_modules/lil-gui/dist/lil-gui.esm.min.js';
import '../libs/lil-gui-patch.js';
import * as util from './util.js';
import { config, params } from './params.js';

const NUM_NODES = 6;
const GRID_SIZE = 0;
const SHOW_INDICES = false;
const NODE_SIZE = 10;
const STROKE_WEIGHT = 1;
const USE_LETTERS = true;
const FILL_LETTERS = false;
const FILL_CIRCLES = false;
const USE_NODE_BACKDROP = false;
const BACKDROP_SCALE = 200;
const SEED = 0;
// const BG = [255,255,250];
const BG = [237, 232, 217];

const SHOW_M_AND_K = true;
const M_AND_K_DIST = 330;
const M_AND_K_EXCL = 60;

const SHOW_LOGO = true;
const LOGO_SIZE = 70;

const CONNECT_MIN = 1;
const CONNECT_MAX = 3;

const CONNECT_STEP_CHANCE = 0;
const CONNECT_STEP_MIN = 1;
const CONNECT_STEP_MAX = 5;

const BORDER = 60;
const MIN_DIST = 50;
const MIN_DIST_RETRY = 999;

const USE_BEZIER = true;
const BEZIER_CONTROL = 75; // [0,100]

const ADD_BEZIER_BI = true;
const BEZIER_BI_POINT = 40;
const BEZIER_BI_CONTROL = 50;
const SHOW_BI_POINT = false;

const SVG_ADD_FRAME = true;
const SVG_FORMAT = [297, 420];
const SVG_DPI = 600 / 7; // determines printed size (e.g map height of 600 to 7in -> 600/7)

// Variables
let gui;
let img_d, img_dm, img_o, img_m, img_k, img_logo;
let beziers = [];

function preload() {
    img_d = loadImage('../img/png/D.png');
    img_dm = loadImage('../img/png/ꓷ.png');
    img_o = loadImage('../img/png/O.png');
    img_m = loadImage('../img/png/M.png');
    img_k = loadImage('../img/png/K.png');
    img_logo = loadImage('../img/logo_emboss.png');
}

function setup() {
    createCanvas(...get_size(config.FORMAT, config.MAX_W, config.MAX_H));
    pixelDensity(config.PIXEL_DENSITY);
    frameRate(config.FPS);

    paper.setup();

    gui = new lil.GUI();
    // gui.title('');
    gui.addAll(params);
    gui.show(false);

    noLoop();
    main();
}

function draw() {
    // console.log(frameCount);
}

// Get format according to ascpect ratio and maximum width/height
// Returns: [width, height]
function get_size(aspect_w_by_h, max_w = 600, max_h = 600) {
    if (aspect_w_by_h > 1) {
        // landscape
        return [max_w, floor(max_w / aspect_w_by_h)];
    } else {
        // portrait
        return [floor(max_h * aspect_w_by_h), max_h];
    }
}

function draw_bezier(...args) {
    bezier(...args);
    beziers.push(args);
}

// connect two points with a pipe
function pipe_h(x1, y1, x2, y2) {
    // middle point
    const m1 = x1 + (x2 - x1) * BEZIER_CONTROL / 100;
    const m2 = x2 - (x2 - x1) * BEZIER_CONTROL / 100;
    draw_bezier(x1, y1, m1, y1, m2, y2, x2, y2)
}

// function pipe_v(x1, y1, x2, y2) {
//   // middle point
//   const mx = x1 + (x2 - x1) * BEZIER_CONTROL/100;
//   // const my = y1 + (y2 - y1) * BEZIER_CONTROL/100;
//   bezier(x1, y1, x1, my, x2, my, x2, y2)
// }

function snap_to_grid(arr) {
    if (GRID_SIZE <= 0) { return arr; }
    return arr.map(x => floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2);
}

function in_box(x, y, box) {
    return !(x < box[0] || x > box[0] + box[2] || y < box[1] || y > box[1] + box[3]);
}

// box: [x,y,w,h]
function get_random_pos(nodes = [], box = [], excl_boxes = []) {
    // minimum distance of (x,y) to other nodes
    function min_dist(x, y) {
        let min_d = Infinity;
        for (let n of nodes) {
            const d = dist(x, y, ...n);
            if (d < min_d) {
                min_d = d;
            }
        }
        return min_d;
    }

    let i = 0,
        x = 0,
        y = 0;
    while (i < MIN_DIST_RETRY) {
        i += 1;
        if (box.length == 4) {
            x = box[0] + random(box[2]);
            y = box[1] + random(box[3]);
        } else {
            x = BORDER + random(width - 2 * BORDER);
            y = BORDER + random(height - 2 * BORDER);
        }

        let in_excl_box = false;

        for (let b of excl_boxes) {
            if (b.length !== 4) { continue; }
            if (in_box(x, y, b)) {
                in_excl_box = true;
                break;
            }
        }
        if (in_excl_box) { continue; }

        let min_d = min_dist(x, y);
        if (min_d >= MIN_DIST) {
            // console.log('dist', min_d);
            break;
        }
    }
    return snap_to_grid([x, y]);
}

// find connection that has its middle point nearest to (x,y)
function connection_near(x, y, connections, nodes) {
    let min_dist = Infinity;
    let conn = null;
    for (let [i, connected] of connections.entries()) {
        for (let j of connected) {
            const a = nodes[i];
            const b = nodes[j];
            const m = [a[0] + (b[0] - a[0]) / 2, a[1] + (b[1] - a[1]) / 2]; // middle point of connection
            const d = dist(...m, x, y);
            if (d < min_dist) {
                min_dist = d;
                conn = [i, j];
            }
        }
    }
    return conn;
}

function node_near(x, y, nodes) {
    const n_dist = [];
    for (let [i, n] of nodes.entries()) {
        n_dist.push({ node: i, dist: dist(...n, x, y) });
    }
    n_dist.sort((a, b) => a.dist - b.dist);
    return n_dist.map(x => x.node);
}

// https://en.wikipedia.org/wiki/Bézier_curve#Cubic_B.C3.A9zier_curves
function bezier_point(t, x1, y1, x2, y2, x3, y3, x4, y4) {
    const b1 = (1 - t) ** 3;
    const b2 = 3 * (1 - t) ** 2 * t;
    const b3 = 3 * (1 - t) * (t ** 2);
    const b4 = t ** 3;
    return [
        b1 * x1 + b2 * x2 + b3 * x3 + b4 * x4,
        b1 * y1 + b2 * y2 + b3 * y3 + b4 * y4
    ];
}

function bezier_slope(t, x1, y1, x2, y2, x3, y3, x4, y4) {
    const b1 = 3 * (1 - t) ** 2;
    const b2 = 6 * (1 - t) * t;
    const b3 = 3 * t ** 2;
    return [
        b1 * (x2 - x1) + b2 * (x3 - x2) + b3 * (x4 - x3),
        b1 * (y2 - y1) + b2 * (y3 - y2) + b3 * (y4 - y3)
    ];
}

function draw_bifurcation(x1, y1, x2, y2, x3, y3) {
    // make sure point 1 is left of point2
    if (x1 > x2) {
        [x1, x2] = [x2, x1];
        [y1, y2] = [y2, y1];
    }
    const mx = x1 + (x2 - x1) / 2; // middle (x) between point 1 and point 2
    // bezier control points between point 1 and point 2
    const c1 = [x1 + (x2 - x1) / 100 * BEZIER_CONTROL, y1];
    const c2 = [x2 - (x2 - x1) / 100 * BEZIER_CONTROL, y2];

    let p, s;

    if (x3 >= mx) { // go from left to right. point 1 to point 2
        p = bezier_point(BEZIER_BI_POINT / 100, x1, y1, ...c1, ...c2, x2, y2); // bifurcation point
        s = bezier_slope(BEZIER_BI_POINT / 100, x1, y1, ...c1, ...c2, x2, y2); // slope vector
    } else {
        p = bezier_point(BEZIER_BI_POINT / 100, x2, y2, ...c2, ...c1, x1, y1); // bifurcation point
        s = bezier_slope(BEZIER_BI_POINT / 100, x2, y2, ...c2, ...c1, x1, y1); // slope vector
    }
    // fill(0)
    // ellipse(...p, 5, 5);

    // normalize slope
    let sl = dist(0, 0, ...s);
    s = [s[0] / sl, s[1] / sl];
    // bifurcation bezier
    const blen = dist(...p, x2, y2); // length from bifurcation point to original branch endpoint
    const bc1 = [p[0] + s[0] * blen / 100 * BEZIER_BI_CONTROL, p[1] + s[1] * blen / 100 * BEZIER_BI_CONTROL];
    const bc2 = [x3 - (x3 - p[0]) / 100 * BEZIER_BI_CONTROL, y3];
    draw_bezier(...p, ...bc1, ...bc2, x3, y3);
    return p;
}

// Save text data to file
// Triggers download mechanism in the browser
function save_text(text, filename, charset = 'text/plain') {
    let link = document.createElement('a');
    link.download = filename;
    link.href = 'data:' + charset + ';charset=UTF-8,' + encodeURIComponent(text);
    link.style.display = 'none'; // Firefox
    document.body.appendChild(link); // Firefox'
    link.click();
    document.body.removeChild(link); // Firefox
}

function mm2px(mm, dpi = SVG_DPI) {
    return mm / 25.4 * dpi;
}

function save_svg() {
    const timestamp = new Date().toISOString();
    const format_px = [mm2px(SVG_FORMAT[0]), mm2px(SVG_FORMAT[1])];
    console.log(format_px);
    let xml = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${SVG_FORMAT[0]}mm" height="${SVG_FORMAT[1]}mm" viewBox="0 0 ${format_px[0]} ${format_px[1]}" stroke="black" fill="none" stroke-linecap="round" stroke-width="${STROKE_WEIGHT}">\n`;
    // const tl = [ mm2px(SVG_FORMAT[0])/2 - width/2, mm2px(SVG_FORMAT[1])/2 - height/2 ];
    //translate(${tl[0]} ${tl[1]})
    // xml += `  <g transform="translate(${SVG_FORMAT[0]/2}mm ${SVG_FORMAT[1]/2}mm) scale(1.5) translate(${-width/2} ${-height/2})">\n`;
    xml += `  <g transform="translate(${format_px[0]/2} ${format_px[1]/2}) translate(${-width/2} ${-height/2})">\n`;
    if (SVG_ADD_FRAME) {
        xml += `    <rect x="0" y="0" width="${width}" height="${height}" />\n`;
    }
    for (let b of beziers) {
        xml += `    <path d="M ${b[0]} ${b[1]} C ${b[2]} ${b[3]} ${b[4]} ${b[5]} ${b[6]} ${b[7]}"/>\n`;
    }
    xml += '  </g>\n';
    xml += '</svg>\n';
    save_text(xml, timestamp + '.svg', 'image/svg+xml');
    return timestamp;
}

function main() {
    background(BG);
    if (SEED > 0) {
        randomSeed(SEED);
    }

    const pos_m = [width / 2 - M_AND_K_DIST / 2, height / 2];
    const pos_k = [width / 2 + M_AND_K_DIST / 2, height / 2];
    let excl_boxes = [];
    if (SHOW_M_AND_K) {
        const excl_m = [pos_m[0] - M_AND_K_EXCL / 2, pos_m[1] - M_AND_K_EXCL / 2, M_AND_K_EXCL, M_AND_K_EXCL];
        const excl_k = [pos_k[0] - M_AND_K_EXCL / 2, pos_k[1] - M_AND_K_EXCL / 2, M_AND_K_EXCL, M_AND_K_EXCL];
        excl_boxes = [excl_m, excl_k];
    }

    // random nodes
    const nodes = [];
    for (let i = 0; i < NUM_NODES; i++) {
        nodes.push(get_random_pos(nodes, [], excl_boxes));
    }

    // compute distance matrix
    const distances = [];
    for (let i = 0; i < NUM_NODES; i++) {
        distances.push([]);
    }
    for (let [i, n] of nodes.entries()) {
        distances[i][i] = 0;
        for (let j = i + 1; j < NUM_NODES; j++) {
            const d = dist(...nodes[i], ...nodes[j]);
            distances[i][j] = d;
            distances[j][i] = d;
        }
    }
    console.log(distances);

    // compute nearest
    const nearest = [];
    for (let ds of distances) {

        // find smallest element

        let limit_d = -1;
        const order = [];
        for (let j = 0; j < NUM_NODES; j++) {
            let min_idx = 0;
            let min_d = Infinity;

            for (let [i, d] of ds.entries()) {
                if (d > limit_d && d < min_d) {
                    min_d = d;
                    min_idx = i;
                }
            }
            limit_d = min_d;
            order.push(min_idx);
        }

        nearest.push(order);
    }
    console.log(nearest);

    // compute connection matrix
    const connections = [];
    for (let i = 0; i < NUM_NODES; i++) {
        connections.push([]);
    }
    noFill();
    stroke(0);
    strokeWeight(STROKE_WEIGHT);
    for (let i = 0; i < NUM_NODES; i++) {
        let next = 1;

        if (random(100) < CONNECT_STEP_CHANCE) {
            let step = floor(random(CONNECT_STEP_MIN, CONNECT_STEP_MAX + 1));
            step = min(NUM_NODES - 1, max(1, step));
            next = step;
        }
        const connect_target = random(CONNECT_MIN, CONNECT_MAX);
        while (connections[i].length < connect_target && next < NUM_NODES) {
            // add connection to nearest unconnected node that can take another connection
            let j = nearest[i][next];
            if (!connections[i].includes(j) &&
                !connections[j].includes(i) &&
                connections[j].length < CONNECT_MAX) {
                connections[i].push(j);
                connections[j].push(i);

                if (USE_BEZIER) {
                    pipe_h(...nodes[i], ...nodes[j]);
                } else {
                    line(...nodes[i], ...nodes[j]);
                }
            }
            next += 1;
        }
    }

    // draw nodes
    if (NODE_SIZE > 0) {
        ellipseMode(CENTER);
        rectMode(CENTER);
        imageMode(CENTER);
        textAlign(CENTER, TOP);
        noStroke();
        for (let [i, n] of nodes.entries()) {
            if (USE_LETTERS) {
                let img;
                if (random() < 0.5) {
                    if (random() < 0.5) { img = img_dm; } else { img = img_d; }
                } else { img = img_o; }

                if (USE_NODE_BACKDROP) {
                    noStroke();
                    fill(BG);
                    ellipse(...n, NODE_SIZE * BACKDROP_SCALE / 100 * 0.75, NODE_SIZE * BACKDROP_SCALE / 100);
                }
                if (FILL_LETTERS) { fill(0); } else { fill(BG); }
                rect(...n, NODE_SIZE * 0.66, NODE_SIZE);
                image(img, ...n, NODE_SIZE, NODE_SIZE);
            } else {
                if (USE_NODE_BACKDROP) {
                    noStroke();
                    fill(BG);
                    ellipse(...n, NODE_SIZE * BACKDROP_SCALE / 100, NODE_SIZE * BACKDROP_SCALE / 100);
                }
                if (FILL_CIRCLES) { fill(0);
                    noStroke(); } else { fill(BG);
                    stroke(0); }
                ellipse(...n, NODE_SIZE, NODE_SIZE);
            }

            if (SHOW_INDICES) {
                fill(0);
                text(i, n[0], n[1] + NODE_SIZE / 2);
            }
        }
    }

    if (SHOW_M_AND_K && USE_LETTERS) {
        // let pos_m = get_random_pos(nodes, []);
        // let pos_k = get_random_pos(nodes, []);
        // if (pos_m[0] > pos_k[0]) {
        //   // make sure m is left of k
        //   [pos_m, pos_k] = [pos_k, pos_m];
        // }

        image(img_m, ...pos_m, NODE_SIZE, NODE_SIZE);
        image(img_k, ...pos_k, NODE_SIZE, NODE_SIZE);
    }

    if (SHOW_LOGO) {
        imageMode(CORNER);
        blendMode(MULTIPLY);
        tint(255, 255 * 0.5); // half opacity
        image(img_logo, width - LOGO_SIZE, height - LOGO_SIZE, LOGO_SIZE, LOGO_SIZE);
    }

    if (ADD_BEZIER_BI) {
        // find two connected nodes nearest to center
        let conn = connection_near(width / 2, height / 2, connections, nodes);
        if (conn !== null) {
            // find nearby node that's not connected
            const near = node_near(width / 2, height / 2, nodes);
            let n = null;
            for (let i of near) {
                if (!connections[conn[0]].includes(i) && !connections[conn[1]].includes(i)) {
                    n = i;
                    break;
                }
            }
            if (n !== null) {
                console.log('Bifurcation:', conn, 'to', n)
                noFill();
                stroke(0);
                const p = draw_bifurcation(...nodes[conn[0]], ...nodes[conn[1]], ...nodes[n]);
                if (SHOW_BI_POINT) {
                    fill(0);
                    noStroke();
                    ellipse(...p, NODE_SIZE / 3, NODE_SIZE / 3);
                }
            } else {
                console.log('Couldn\'t find bifurcation additional node')
            }
        } else {
            console.log('Couldn\'t find bifurcation original connection')
        }
    }
}

document.addEventListener('keydown', e => {
    // console.log(e.key, e.keyCode, e);

    if (e.key == 'f') { // f .. fullscreen
        util.toggle_fullscreen();
    } else if (e.key == 's') { // s .. save frame
        // util.save_canvas( params );
        const ts = save_svg();
        saveCanvas(ts + '.png');
    } else if (e.key == 'h' || e.key == 'Tab') { // h or Tab .. toggle gui
        gui.toggle();
        e.preventDefault();
    }

});

util.register_global({ setup, draw, preload });