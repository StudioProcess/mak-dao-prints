import * as lil from '../node_modules/lil-gui/dist/lil-gui.esm.min.js';
import '../libs/lil-gui-patch.js';
import * as util from './util.js';
import { config, params } from './params.js';

function setup() {
    console.log('setup');
    console.log(config);
    console.log(params);
}

function draw() {
    // console.log(frameCount);
}

util.register_global({setup, draw});
