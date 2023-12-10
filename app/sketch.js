import * as lil from '../node_modules/lil-gui/dist/lil-gui.esm.min.js';
import '../libs/lil-gui-patch.js';
import * as util from './util.js';
import { config, params } from './params.js';
import * as pt from './pathtools.js';

const SHOW_INDICES = false;
// const NODE_SIZE = 10;
// const STROKE_WEIGHT = 1;
const USE_LETTERS = true;
const FILL_LETTERS = false;
const FILL_CIRCLES = false;
const USE_NODE_BACKDROP = false;
const BACKDROP_SCALE = 200;

// const BG = [255,255,250];
const BG = [237, 232, 217];
const SHOW_LOGO = true;
const LOGO_SIZE = 70;

const MIN_DIST_RETRY = 999;

const SHOW_BI_POINT = false;

// Variables
let gui;
let img_logo;
let letters_img = {};
let letters_svg = {};
let letters_mask = {};
let state; // state describing the drawing
let svg_container;

function load_letter_img(letter, cb, suffix = '.png', prefix = '../img/png/') {
    const path = prefix + letter + suffix;
    // console.log(`Loading (PNG) ${letter}: ${path}`);
    return loadImage(path, cb);
}

function load_letter_svg(letter, cb, suffix = '.svg', prefix = '../img/svg/') {
    const path = prefix + letter + suffix;
    // console.log(`Loading (SVG) ${letter}: ${path}`);
    return loadStrings(path, cb);
}

function svg_element(svg_text) {
    const template = document.createElement('template');
    template.innerHTML = svg_text;
    return template.content.firstElementChild;
}

function preload() {
    for (let letter of ['D', 'ꓷ', 'O', 'M', 'K']) {
        letters_img[letter] = load_letter_img(letter);
        load_letter_svg(letter, (strings) => {
            letters_svg[letter] = svg_element( strings.join('\n') );
        });
        load_letter_svg(letter, (strings) => {
            letters_mask[letter] = svg_element( strings.join('\n') );
        }, ' Mask.svg');
    }
    img_logo = loadImage('../img/logo_emboss.png');
}

function setup() {
    createCanvas(...get_size(config.FORMAT, config.MAX_W, config.MAX_H));
    pixelDensity(config.PIXEL_DENSITY);
    frameRate(config.FPS);
    noLoop();

    paper.setup();

    // GUI
    gui = new lil.GUI();
    // gui.title('');
    gui.addAll(params);
    // gui.show(false);
    
    const update_on_change = ['seed', 'num_nodes', 'grid_size', 'connect_min', 'connect_max', 'connect_step_chance', 'connect_step_min', 'connect_step_max', 'border', 'min_dist', 'show_m_and_k', 'm_and_k_dist', 'm_and_k_excl', 'use_bezier', 'bezier_control', 'add_bezier_bi', 'bezier_bi_point', 'bezier_bi_control', 'layout_center', 'layout_center_mode', 'svg_show_hatch', 'node_size', 'stroke_weight'];
    const update_on_finish_change = ['svg_hatch_spacing', 'svg_hatch_direction', 'svg_crosshatch'];
    const update = () => { redraw(); };
    update_on_change.forEach( x => gui.get(x).onChange(update) );
    update_on_finish_change.forEach( x => gui.get(x).onFinishChange(update) );
    svg_container = document.querySelector("#svg_container");
    gui.get('show_svg').onFinishChange(shown => { svg_container.style.display = shown ? 'flex' : 'none'; });
    gui.get('SAVE').onChange( () => { save(); })
}

function draw() {
    console.log(`→ Redrawing (${frameCount})`);
    state = generate();
    draw_p5(state);
    console.log(state);
    // show svg
    const svg = draw_svg(state, config.SVG_PRECISION);
    svg_container.replaceChildren(svg_element(svg));
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

// connect two points with a pipe
// returns arguments for bezier()
function pipe_h(x1, y1, x2, y2) {
    // middle point
    const m1 = x1 + (x2 - x1) * params.bezier_control / 100;
    const m2 = x2 - (x2 - x1) * params.bezier_control / 100;
    return [x1, y1, m1, y1, m2, y2, x2, y2];
}

// function pipe_v(x1, y1, x2, y2) {
//   // middle point
//   const mx = x1 + (x2 - x1) * BEZIER_CONTROL/100;
//   // const my = y1 + (y2 - y1) * BEZIER_CONTROL/100;
//   bezier(x1, y1, x1, my, x2, my, x2, y2)
// }

function snap_to_grid(arr) {
    const GRID_SIZE = params.grid_size;
    if (GRID_SIZE <= 0) { return arr; }
    return arr.map(x => floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2);
}

function in_box(x, y, box) {
    return !(x < box[0] || x > box[0] + box[2] || y < box[1] || y > box[1] + box[3]);
}

// box: [x,y,w,h]
function get_random_pos(nodes = [], box = [], excl_boxes = []) {
    const BORDER = params.border;
    const MIN_DIST = params.min_dist;
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
function connection_near(x, y, connection_matrix, nodes) {
    let min_dist = Infinity;
    let conn = null;
    for (let [i, connected] of connection_matrix.entries()) {
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

function bifurcation(x1, y1, x2, y2, x3, y3) {
    const BEZIER_BI_POINT = params.bezier_bi_point;
    const BEZIER_BI_CONTROL = params.bezier_bi_control;
    // make sure point 1 is left of point2
    if (x1 > x2) {
        [x1, x2] = [x2, x1];
        [y1, y2] = [y2, y1];
    }
    const mx = x1 + (x2 - x1) / 2; // middle (x) between point 1 and point 2
    // bezier control points between point 1 and point 2
    const c1 = [x1 + (x2 - x1) / 100 * params.bezier_control, y1];
    const c2 = [x2 - (x2 - x1) / 100 * params.bezier_control, y2];

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
    return {
        bezier: [...p, ...bc1, ...bc2, x3, y3],
        point: p
    };
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

function mm2px(mm, dpi = config.SVG_DPI) {
    return mm / 25.4 * dpi;
}

function save_svg() {
    const timestamp = new Date().toISOString();
    const text = draw_svg(state, config.SVG_PRECISION, true); // flag for export
    save_text(text, timestamp + '.svg', 'image/svg+xml');
    return timestamp;
}

function generate() {
    const NUM_NODES = params.num_nodes;
    const CONNECT_MIN = params.connect_min;
    const CONNECT_MAX = params.connect_max;
    const CONNECT_STEP_CHANCE = params.connect_step_chance;
    const CONNECT_STEP_MIN = params.connect_step_min;
    const CONNECT_STEP_MAX = params.connect_step_max;
    const SHOW_M_AND_K = params.show_m_and_k;
    const M_AND_K_DIST = params.m_and_k_dist;
    const M_AND_K_EXCL = params.m_and_k_excl;
    
    if (params.seed <= 0) {
        randomizeSeed(false); // do not redraw; just set param and update gui
    }
    randomSeed(params.seed);
    
    state = {};
    state.seed = params.seed;

    // M and K
    const pos_m = [width / 2 - M_AND_K_DIST / 2, height / 2];
    const pos_k = [width / 2 + M_AND_K_DIST / 2, height / 2];
    let excl_boxes = [];
    if (SHOW_M_AND_K) {
        const excl_m = [pos_m[0] - M_AND_K_EXCL / 2, pos_m[1] - M_AND_K_EXCL / 2, M_AND_K_EXCL, M_AND_K_EXCL];
        const excl_k = [pos_k[0] - M_AND_K_EXCL / 2, pos_k[1] - M_AND_K_EXCL / 2, M_AND_K_EXCL, M_AND_K_EXCL];
        excl_boxes = [excl_m, excl_k];
        state.excl_boxes = excl_boxes;
    }
    state.pos_m = pos_m;
    state.pos_k = pos_k;
    // state.extra_letters = [ {letter: 'M', pos: pos_m}, {letter: 'K', pos: pos_k} ];

    // compute random nodes
    const nodes = [];
    for (let i = 0; i < NUM_NODES; i++) {
        nodes.push(get_random_pos(nodes, [], excl_boxes));
    }
    state.nodes = nodes;
    
    // random letter per node
    const node_letters = [];
    for (let i = 0; i < NUM_NODES; i++) {
        let letter;
        if (random() < 0.5) {
            if (random() < 0.5) { letter = "ꓷ"; } else { letter = "D"; }
        } else { letter = "O"; }
        node_letters.push(letter);
    }
    state.node_letters = node_letters;


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
    state.distances = distances;
    // console.log(distances);

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
    state.nearest = nearest;
    // console.log(nearest);

    // compute connection matrix
    const connection_matrix = [];
    const connections = [];
    for (let i = 0; i < NUM_NODES; i++) {
        connection_matrix.push([]);
    }
    for (let i = 0; i < NUM_NODES; i++) {
        let next = 1;

        if (random(100) < CONNECT_STEP_CHANCE) {
            let step = floor(random(CONNECT_STEP_MIN, CONNECT_STEP_MAX + 1));
            step = min(NUM_NODES - 1, max(1, step));
            next = step;
        }
        const connect_target = random(CONNECT_MIN, CONNECT_MAX);
        while (connection_matrix[i].length < connect_target && next < NUM_NODES) {
            // add connection to nearest unconnected node that can take another connection
            let j = nearest[i][next];
            if (!connection_matrix[i].includes(j) &&
                !connection_matrix[j].includes(i) &&
                connection_matrix[j].length < CONNECT_MAX) {
                connection_matrix[i].push(j);
                connection_matrix[j].push(i);
                connections.push([i, j]);
            }
            next += 1;
        }
    }
    state.connection_matrix = connection_matrix;
    state.connections = connections;

    // compute bifurcation
    state.bifurcation = null;
    if (params.add_bezier_bi) {
        // find two connected nodes nearest to center
        let conn = connection_near(width / 2, height / 2, connection_matrix, nodes);
        if (conn !== null) {
            // find nearby node that's not connected
            const near = node_near(width / 2, height / 2, nodes);
            let n = null;
            for (let i of near) {
                if (!connection_matrix[conn[0]].includes(i) && !connection_matrix[conn[1]].includes(i)) {
                    n = i;
                    break;
                }
            }
            if (n !== null) {
                state.bifurcation = { from_conn: conn, to_node: n };
            } else {
                console.log('Couldn\'t find bifurcation additional node')
            }
        } else {
            console.log('Couldn\'t find bifurcation original connection')
        }
    }
    
    return state;
}

function draw_p5(state) {
    const NODE_SIZE = params.node_size;
    background(BG);
    
    // draw connections
    noFill();
    stroke(0);
    strokeWeight(params.stroke_weight);
    const nodes = state.nodes;
    for (let [i, j] of state.connections) {
        if (params.use_bezier) {
            bezier( ...pipe_h(...nodes[i], ...nodes[j]) );
        } else {
            line(...nodes[i], ...nodes[j]);
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
                const letter = state.node_letters[i];
                const img = letters_img[letter];
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
                if (FILL_CIRCLES) { fill(0); noStroke(); }
                else { fill(BG); stroke(0); }
                ellipse(...n, NODE_SIZE, NODE_SIZE);
            }
    
            if (SHOW_INDICES) {
                fill(0);
                text(i, n[0], n[1] + NODE_SIZE / 2);
            }
        }
    }
    
    // draw M and K (extra letters)
    if (params.show_m_and_k && USE_LETTERS) {
        image(letters_img['M'], ...state.pos_m, NODE_SIZE, NODE_SIZE);
        image(letters_img['K'], ...state.pos_k, NODE_SIZE, NODE_SIZE);
        // for (let {letter, pos} of state.extra_letters) {
        //     image(letters_img[letter], ...pos, NODE_SIZE, NODE_SIZE);
        // }
    }
    
    // draw logo
    if (SHOW_LOGO) {
        push();
        imageMode(CORNER);
        blendMode(MULTIPLY);
        tint(255, 255 * 0.5); // half opacity
        image(img_logo, width - LOGO_SIZE, height - LOGO_SIZE, LOGO_SIZE, LOGO_SIZE);
        pop();
    }
    
    // draw bifurcation
    if (params.add_bezier_bi && state.bifurcation) {
        const nodes = state.nodes;
        const conn = state.bifurcation.from_conn;
        const n = state.bifurcation.to_node;
        noFill();
        stroke(0);
        const { bezier: b, point: p } = bifurcation(...nodes[conn[0]], ...nodes[conn[1]], ...nodes[n]);
        bezier(...b);
        if (SHOW_BI_POINT) {
            fill(0);
            noStroke();
            ellipse(...p, NODE_SIZE / 3, NODE_SIZE / 3);
        }
    }
}

function decimals(precision = 1) {
    return function(num) {
        return +num.toFixed(precision);
    }
}

function letter_svg_data(letter) {
    return letters_svg[letter].querySelector('path').getAttribute('d');
}

function mask_svg_data(letter) {
    return letters_mask[letter].querySelector('path').getAttribute('d');
}

function letter_path(letter, pos, decimals = 2, mask = false, data_only = false) {
    const m = pt.matrix().translate(...pos).scale(params.node_size/100).translate(-50, -50);
    let d = mask ? mask_svg_data(letter) : letter_svg_data(letter)
    d = pt.transform_path(d, m, decimals);
    if (data_only) { return d; }
    return `<path d="${d}"/>\n`;
    
    // return `<path transform="translate(${pos[0]} ${pos[1]}) scale(${NODE_SIZE/100}) translate(-50 -50)" vector-effect="non-scaling-stroke" d="${d}"/>\n`;
}

function draw_svg(state, precision = 2, format_for_export = false) {
    const size = format_for_export ? [config.SVG_FORMAT[0] + 'mm', config.SVG_FORMAT[1] + 'mm'] : [width, height];
    const format_px = format_for_export ? [mm2px(config.SVG_FORMAT[0]), mm2px(config.SVG_FORMAT[1])] : [width, height];
    const trunc = decimals(precision);
    
    // console.log(format_px);
    let xml = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${size[0]}" height="${size[1]}" viewBox="0 0 ${format_px[0]} ${format_px[1]}" stroke="black" fill="none" stroke-linecap="round" stroke-width="${params.stroke_weight}">\n`;
    
    if (format_for_export) {
        xml += `  <g transform="translate(${trunc(format_px[0]/2)} ${trunc(format_px[1]/2)}) translate(${-width/2} ${-height/2})">\n`;
        if (config.SVG_ADD_FRAME) {
            xml += `    <rect id="frame" x="0" y="0" width="${width}" height="${height}"/>\n`;
        }
    } else {
       xml += `  <g>\n`;
    }

    // Note: For Axidraw Layer Control see: https://wiki.evilmadscientist.com/AxiDraw_Layer_Control
    
    // translation for connections and letters (except m and k)
    let dx = 0, dy = 0; 
    if (params.layout_center) {
        if (params.layout_center_mode == 'bbox') {
            const bbox = pt.bbox(state.nodes);
            dx = width/2 - (bbox[2] + bbox[0]) / 2;
            dy = height/2 - (bbox[3] + bbox[1]) / 2;
        } else if (params.layout_center_mode == 'avg') {
            const avg = pt.avg(state.nodes);
            dx = width/2 - avg[0];
            dy = height/2 - avg[1];
        }
    }
    
    // connections
    xml += `    <g id="connections" inkscape:label="connections" inkscape:groupmode="layer">\n`;
    if (params.layout_center) {
        xml += `      <g transform="translate(${dx} ${dy})">\n`;
    }
    const nodes = state.nodes;
    const mask_m = letter_path('M', state.pos_m, precision, true, true);
    const mask_k = letter_path('K', state.pos_k, precision, true, true);
    for (let [i, j] of state.connections) {
        if (params.use_bezier) {
            const b = pipe_h(...nodes[i], ...nodes[j]).map(trunc); // unclipped connection between nodes i and j
            let paths = [ `M ${b[0]} ${b[1]} C ${b[2]} ${b[3]} ${b[4]} ${b[5]} ${b[6]} ${b[7]}` ]; // path for the connection
            // clip against *all* nodes (to clip overlaps as well)
            for (let [i, node] of nodes.entries()) {
                const letter = letter_path( state.node_letters[i], node, precision, true, true); // letter mask path for node
                paths = pt.clip_multiple(paths, letter);
            }
            // clip against m and k
            paths = pt.clip_multiple(paths, mask_m);
            paths = pt.clip_multiple(paths, mask_k);
            for (let path of paths) {
                path = pt.join_path(pt.parse_path(path), precision);
                xml += `      <path d="${path}"/>\n`;
            }
        } else {
            const l = [...nodes[i], ...nodes[j]].map(trunc);
            xml += `      <path d="M ${l[0]} ${l[1]} L ${l[2]} ${l[3]}"/>\n`;
            // TODO: clip
        }
    }
    // add bifurcation path
    if (params.add_bezier_bi && state.bifurcation) {
        const nodes = state.nodes;
        const conn = state.bifurcation.from_conn;
        const n = state.bifurcation.to_node;
        if (params.use_bezier) {
            const { bezier: b, point: p } = bifurcation(...nodes[conn[0]], ...nodes[conn[1]], ...nodes[n]);
            let paths = [ `M ${b[0]} ${b[1]} C ${b[2]} ${b[3]} ${b[4]} ${b[5]} ${b[6]} ${b[7]}` ]; // path for the bifurcation
            // clip against *all* nodes (to clip overlaps as well)
            for (let [i, node] of nodes.entries()) {
                const letter = letter_path( state.node_letters[i], node, precision, true, true); // letter mask path for node
                paths = pt.clip_multiple(paths, letter);
            }
            // clip against m and k
            paths = pt.clip_multiple(paths, mask_m);
            paths = pt.clip_multiple(paths, mask_k);
            for (let path of paths) {
                path = pt.join_path(pt.parse_path(path), precision);
                xml += `      <path d="${path}"/>\n`;
            }
        } else {
            const p1 = nodes[conn[0]];
            const p2 = nodes[conn[1]];
            const p = [ p2[0] + (p1[0]-p2[0])*params.bezier_bi_point/100, p2[1] + (p1[1]-p2[1])*params.bezier_bi_point/100 ];
            const l = [...p, ...nodes[n]].map(trunc);
            xml += `      <path d="M ${l[0]} ${l[1]} L ${l[2]} ${l[3]}"/>\n`;
        }
    }
    if (params.layout_center) {
        xml += `      </g>\n`;
    }
    xml += `    </g>\n`;
    
    // Fill hatching (for nodes, m and k)
    xml += `    <g id="hatching" inkscape:label="hatching" inkscape:groupmode="layer" ${params.svg_show_hatch ? 'stroke="black"' : 'stroke="none"'} fill="none">\n`;
    if (params.layout_center) {
        xml += `      <g transform="translate(${dx} ${dy})">\n`;
    }
    for (let [i, node] of nodes.entries()) {
        const letter = letter_path(state.node_letters[i], node, precision, false, true); 
        const path = pt.hatch( letter, params.svg_hatch_spacing, params.svg_hatch_direction, true, precision );
        xml += `       <path d="${path}"/>\n`;
        if (params.svg_crosshatch) {
            const cross = pt.hatch( letter, params.svg_hatch_spacing, params.svg_hatch_direction-90, true, precision );
            xml += `       <path d="${cross}"/>\n`;
        }
    }
    if (params.layout_center) {
        xml += `      </g>\n`;
    }
    const letter_m = letter_path('M', state.pos_m);
    const letter_k = letter_path('K', state.pos_k);
    if (params.show_m_and_k) {
        const hatch_m = pt.hatch( letter_m, params.svg_hatch_spacing, params.svg_hatch_direction, true, precision );
        xml += `       <path d="${hatch_m}"/>\n`;
        if (params.svg_crosshatch) {
            const cross_m = pt.hatch( letter_m, params.svg_hatch_spacing, params.svg_hatch_direction-90, true, precision );
            xml += `       <path d="${cross_m}"/>\n`;
        }
        const hatch_k = pt.hatch( letter_k, params.svg_hatch_spacing, params.svg_hatch_direction, true, precision );
        xml += `       <path d="${hatch_k}"/>\n`;
        if (params.svg_crosshatch) {
            const cross_k = pt.hatch( letter_k, params.svg_hatch_spacing, params.svg_hatch_direction-90, true, precision );
            xml += `       <path d="${cross_k}"/>\n`;
        }
    }
    xml += `    </g>\n`;
    
    // letters
    xml += `    <g id="letters" inkscape:label="letters" inkscape:groupmode="layer" ${params.svg_show_hatch ? 'stroke="black" fill="none"' : 'stroke="none" fill="black"'}>\n`;
    if (params.layout_center) {
        xml += `      <g transform="translate(${dx} ${dy})">\n`;
    }
    for (let [i, n] of state.nodes.entries()) {
        const l = state.node_letters[i]; // letter
        n = n.map(trunc);
        xml += '      ' + letter_path(l, n);
    }
    if (params.layout_center) {
        xml += `      </g>\n`;
    }
    // M and K (part of nodes)
    if (params.show_m_and_k) {
        xml += '      ' + letter_m;
        xml += '      ' + letter_k;
    }
    xml += `    </g>\n`;
    
    xml += '  </g>\n';
    xml += '</svg>\n';
    return xml;
}

function nextSeed(d = 1) {
    params.seed = int(params.seed + d);
    if (params.seed < 0) { params.seed = 0; }
    gui.get('seed').update();
    redraw();
}

function randomizeSeed(do_redraw = true) {
    params.seed = int(random(9999) + 1);
    gui.get('seed').update();
    if (do_redraw) {
        redraw();
    }
}

function save() {
    // util.save_canvas( params );
    const ts = save_svg();
    // saveCanvas(ts + '.png');
}

document.addEventListener('keydown', e => {
    // console.log(e.key, e.keyCode, e);

    if (e.key == 'f') { // f .. fullscreen
        util.toggle_fullscreen();
    } else if (e.key == 's') { // s .. save frame
        save();
    } else if (e.key == 'h' || e.key == 'Tab') { // h or Tab .. toggle gui
        gui.toggle();
        e.preventDefault();
    } else if (e.key == 'r') {
        randomizeSeed();
    } else if (e.key == 'ArrowRight' || e.key == ' ') {
        nextSeed(1);
        e.preventDefault();
    } else if (e.key == 'ArrowLeft') {
        nextSeed(-1);
    }
});

util.register_global({ setup, draw, preload });