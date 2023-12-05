//
// General utility functions
// Includes general data I/O
// 


// Set the provided args in the global context i.e. on the window object
// args can be: 
//   object: will use keys as names
//   function: will use a functions' name-attribute if present
export function register_global(...args) {
    for (const arg of args) {
        if (typeof arg == 'function' && arg.name != undefined) {
            window[arg.name] = arg;
        }
        if (typeof arg == 'object') {
            for (const [key, val] of Object.entries(arg)) {
                window[key] = val;
            }
        }
    }
}


// Toggles the browser's fullscreen mode on the body element
export function toggle_fullscreen() {
    if (document.webkitFullscreenEnabled) { // Chrome, Opera, Safari
        if (!document.webkitFullscreenElement) {
            document.querySelector('body').webkitRequestFullscreen();
        } else { document.webkitExitFullscreen(); }
    } else if (document.mozFullScreenEnabled) { // Firefox
        if (!document.mozFullScreenElement) {
            document.querySelector('body').mozRequestFullScreen();
        } else { document.mozCancelFullScreen(); }
    } else if (document.fullscreenEnabled) { // Standard, Edge
        if (!document.fullscreenElement) {
            document.querySelector('body').requestFullscreen();
        } else { document.exitFullscreen(); }
    }
}


// Save text data to file
// Triggers download mechanism in the browser
export function save_text(text, filename) {
    let link = document.createElement('a');
    link.download = filename;
    link.href = 'data:text/plain;charset=UTF-8,' + encodeURIComponent(text);
    link.style.display = 'none';     // Firefox
    document.body.appendChild(link); // Firefox
    link.click();
    document.body.removeChild(link); // Firefox
}


// Load text file (via fetch)
// Returns: Promise that resolves to the loaded text content
export async function load_text(url) {
    const res = await fetch(url);
    return res.text();
}


// Loads / parses CSV file
// options: see csv-parse package: https://csv.js.org/parse/options/
// Returns: Promise that resolves with the parsed CSV records object
// import * as csv_parser from '../node_modules/csv-parse/dist/esm/index.js';
// export async function load_csv(url, options = {}) {
//     const text  = await load_text(url);
//     return new Promise((resolve, reject) => {
//         csv_parser.parse(text, options, (err, records) => {
//             if (err) reject(err);
//             else resolve(records);
//         });
//     });
// }


// Save the canvas to PNG
// Uses first canvas on the page
// Triggers download mechanism in the browser
// Uses an ISO timestamp as the filename
// Optionally takes a params object, which will be saved as JSON, after a 1 sec delay
// NOTE: Needs THREE.WebGLRenderer with preserveDrawingBuffer=true
// TODO: Firefox seems to save only the bottom left quadrant of the canvas. This also happens with 'Right-Click/Save Image as...'
export function save_canvas(params = undefined) {
    let timestamp = new Date().toISOString();
    
    let canvas = document.querySelector('canvas');
    let link = document.createElement('a');
    link.download = timestamp + '.png';
    link.href = canvas.toDataURL();
    link.style.display = 'none';     // Firefox
    document.body.appendChild(link); // Firefox
    link.click();
    document.body.removeChild(link); // Firefox
    
    if (params) {
        let text = JSON.stringify(params, null, 2);
        setTimeout(() => {
            save_text(text, timestamp + '.json');
        }, 1000); // add delay for safari
    }
}


// Parse number from string
// Allows for other comma characters than '.'
// Doesn't deliver partial parsing results. Only parses, if the whole input string matches a number.
// Returns: Parsed number, of input string if parsing fails
export function parse_number(str, comma_char = ',') {
    let str_norm = str.replaceAll(comma_char, '.');
    
    // check for number (incl.scientific notation)
    if (! /^[+-]?\d+(\.\d*)?([eE][+-]?\d+)?$/.test(str_norm)) {
        // console.log('not a number');
        return str; // only allow number characters
    }
    
    let result = Number.parseFloat(str_norm);
    if (Number.isNaN(result)) return str;
    return result;
}


// Async image loading
// Returns: Promise that resolves to the p5.Image object once the image is loaded
// Optionally also calls loadPixels on the image before the promise resolves
// p5 specific (uses loadImage)
export async function load_image(url, load_pixels = false) {
    return new Promise( (resolve, reject) => {
        loadImage(url, img => {
            if (load_pixels) img.loadPixels();
            resolve(img);
        }, e => {
           reject(e);
        });
    });
}


// Sets alpha component of a color to the given value
// Returns a new color
// p5 specific (uses color)
export function set_alpha(col, opacity) {
    let c = color(col);
    c.setAlpha(opacity);
    return c;
}

export function vary_color(col, dh_max, ds_max, dl_max, da_max, bi_directional=false, seed = 0) {
    if (seed !== 0) { randomSeed(seed) };
    
    // random components
    let dh = bi_directional ? random(-dh_max, dh_max) : random(0, dh_max);
    let ds = bi_directional ? random(-ds_max, ds_max) : random(0, ds_max);
    let dl = bi_directional ? random(-dl_max, dl_max) : random(0, dl_max);
    let da = bi_directional ? random(-da_max, da_max) : random(0, da_max);
    
    // starting color in hsl
    // let c_h = hue(col);
    // let c_s = saturation(col);
    // let c_l = lightness(col);
    // let c_a = alpha(col);
    // HSL default is 0..1 for alpha

    push();
    colorMode(HSL); // 360, 100, 100, 1
    // console.log( alpha(col) );
    let out = color( hue(col) + dh, saturation(col) + ds, lightness(col) + dl, alpha(col) / 255 + da);
    out.type = col.type; // copy custom attribute (if present)
    pop();
    
    return out;
}

// Randomly permute an array
// p5 specific (uses random)
// https://stackoverflow.com/a/2450976
export function shuffle(array) {
    array = Array.from(array); // clone
    let currentIndex = array.length,  randomIndex;
    
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = floor(random() * currentIndex);
        currentIndex--;
        
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    
    return array;
}


// Returns array of n successive integers starting at 0 i.e. [ 0, 1, ..., n-1 ]
// n >= 0
export function range0(n) {
    return Array.from( Array(Math.floor(n)).keys() ); // Array.prototype.keys returns an iterator
}

export function range(start, stop) {
    if (stop === undefined) { return range0(start); }
    
    let list = range0(stop-start);
    list = list.map( x => x + start );
    return list;
}



// Get current transformation matrix
// p5 specific (uses drawingContext)
// Returns: DOMMatrix
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getTransform
export function get_current_matrix() {
    // TODO this only works for 2d contexts
    return drawingContext.getTransform();
}


// Transform a point (x,y) by the current transformation matrix
// i.e. M x p
// p5 specific (uses drawingContext)
// Returns: point [x, y]
export function transform_by_current_matrix(x = 0, y = 0) {
    const p = new DOMPoint(x, y).matrixTransform( drawingContext.getTransform() );
    const d = pixelDensity();
    // return new p5.Vector( p.x/d, p.y/d );
    return [ p.x/d, p.y/d ];
}


export function min_max(array) {
    let min = Infinity;
    let max = -Infinity;
    let min_idx = -1;
    let max_idx = -1;
    
    for (let [i, value] of array.entries()) {
        if (value < min) {
            min = value;
            min_idx = i;
        }
        if (value > max) {
            max = value;
            max_idx = i;
        }
    }
    
    return {
        min, max,
        min_idx, max_idx
    };
}

// Sort an array of object by a single key. (Supports number and string keys)
export function sort_objects(array, key, reverse=false) {
    array = [...array]; // copy (as sort mutates the array)
    
    if (array.length > 0) {
        const first = array[0][key];
        if (typeof first === 'number') {
            array.sort( (a, b) => a[key] - b[key] );
        } else { // treat as string (NOTE: untested)
            array.sort( (a, b) => String(a[key]).localeCompare(String(b[key])) );
        }

        if (reverse) {
            array.reverse();
        }
    }

    return array;
}


// Note: doesn't support special characters inside strings
export function objects_to_csv(array, exclude_keys = [], sep =',') {
    if (array.length <= 0) {
        return '';
    }
    
    const first = array[0];
    let keys = Object.keys(first); // use keys of first object
    keys = keys.filter( x => ! exclude_keys.includes(x) );
    
    let out = '';
    out += keys.join(sep) + '\n';
    
    for (let obj of array) {
        const row = [];
        for (let key of keys) {
            const val = obj[key];
            if (val === undefined) { val = ''; }
            row.push(val);
        }
        out += row.join(sep) + '\n';
    }
    
    return out;
}

export function remove_keys(obj, ...keys) {
    obj = Object.assign({}, obj); // copy 
    for (let key of keys) {
        delete obj[key];
    }
    return obj;
}

// export function make_on_change(value, cb) {
//     return function on_change(new_value) {
//         if (new_value !== value) {
//             if (typeof cb === 'function') {
//                 cb(new_value);
//             }
//         }
//         value = new_value;
//     }
// }
