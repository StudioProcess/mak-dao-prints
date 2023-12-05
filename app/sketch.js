import * as lil from '../node_modules/lil-gui/dist/lil-gui.esm.min.js';
import '../libs/lil-gui-patch.js';
import * as util from './util.js';
import { config, params } from './params.js';

let gui;

function setup() {
    createCanvas(config.W, config.H);
    pixelDensity(1);
    frameRate(config.FPS);
    
    paper.setup();
    
    gui = new lil.GUI();
    // gui.title('');
    gui.addAll(params);
}

function draw() {
    // console.log(frameCount);
}

util.register_global({setup, draw});
