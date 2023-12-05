import * as lil from '../node_modules/lil-gui/dist/lil-gui.esm.min.js';

// // Get name of Controller
// // Adds a function getName() to the Controller prototype
// dat.controllers.Controller.prototype.getName = function() {
//   return this.__li.querySelector('.property-name').textContent;
// }


// lock a controller
// in contrast to lil.Controller.prototype.disable, doesn't change visual style much, just disables interaction.
lil.Controller.prototype.lock = function(lock = true) {
    if (lock) { 
        this.$widget.style.pointerEvents = 'none';
        this.$widget.style.opacity = 0.5;
    } else {
        this.$widget.style.pointerEvents = '';
        this.$widget.style.opacity = '';
    }
    return this;
};


// Get Controller by name
// Adds a function get() to the GUI prototype
// Takes one or more controller names, where the last one is the actual name of the controller and the preceding ones are names of (nested) folders the controller is in
lil.GUI.prototype.get = function(...names) {
  for (const [i, name] of names.entries()) {
    if (i === names.length-1) { // the last path element
      // find element
      let el = this.controllers.find( c => c._name == name );
      if (el !== undefined) { return el; }
      el = this.folders.find( f => f._title == name ); // try folders instead
      if (el === undefined) { 
        throw { error: `GUI element not found: ${name}` };
      }
      return el;
    }
    // find folder
    let folder = this.folders.find( f => f._title == name );
    if (folder === undefined) { 
        throw { error: `GUI folder not found: ${name}` };
    }
    // recur
    return folder.get(...names.slice(1));
  }
};

// Add Controllers for all properties of an object
// Adds a function addAll() to the GUI prototype
// the following types of values are recognized:
// number ... adds number field
// string ... adds text field
// function ... adds button
// boolean ... adds check box
// string with hex color ... adds color selector
// array with >= 1 elements ... 1st element is set as the value, remaining elements are used as arguments to the GUI.add() function
//    this allows specifying min/max/step or options
// object ... adds a folder and calls addAll on it again
lil.GUI.prototype.addAll = function(obj) {
  function is_hex_color(str) {
    return /^#[0-9a-fA-F]{3}$/.test(str) || /^#[0-9a-fA-F]{6}$/.test(str);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v == 'string' && is_hex_color(v)) {
      this.addColor(obj, k);
    } else if (['number', 'string', 'function', 'boolean'].includes(typeof v) ) {
      this.add(obj, k);
    } else if (Array.isArray(v)) {
      if (v.length == 0) continue;
      obj[k] = v[0];
      this.add(obj, k, ...v.slice(1));
    } else if (typeof v == 'object') {
      const f = this.addFolder(k); 
      f.addAll(v);
    }
  }
};

// Update display of all controllers
lil.GUI.prototype.updateDisplay = function(obj) {
  for (let c of this.controllersRecursive()) {
    c.updateDisplay();
  }
}

// Shortcut for adding functions, without the need that the function be a property of an object
lil.GUI.prototype.addFunction = function(fn) {
    const obj = { [fn.name]: fn }; // create helper object that contains a property with the function's name
    return this.add(obj, fn.name);
};

lil.GUI.prototype.lock = function(lock = true, label = ' [Locked]') {
    for (let c of this.controllersRecursive()) {
        c.lock(lock);
    }
    if (lock) {
        this.title(this._title + label);
    } else {
        this.title(this._title.slice(0, this._title.length - label.length));
    }
};

lil.GUI.prototype.disable = function(disable = true) {
    for (let c of this.controllersRecursive()) {
        c.disable(disable);
    }
};

/*

const params = {
    w: 100,
    h: 100,
    yes: true,
    fill: '#fff',
    label: 'text',
    log: () => {
        console.log('label', params.label);
    },
    select: ['medium', ['small', 'medium', 'large']],
    val: [50, 0, 100, 1],
    sub: {
        a: 0,
        c: 'hello',
        d: [50, 0, 100, 1],
        e: ['medium', ['small', 'medium', 'large']],
        f: '#FF0'
    },
};

gui = new lil.GUI();
gui.addAll(params);

*/
