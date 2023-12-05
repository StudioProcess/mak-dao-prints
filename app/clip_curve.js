const DYNAMIC_P3 = false;
const Dmask = 'M22.5,97.53L49.253,97.53C63.784,97.53 71.932,91.555 76.141,79.876C79.129,71.592 80.215,60.592 80.215,50C80.215,39.408 79.129,28.408 76.141,20.124C71.932,8.445 63.784,2.47 49.253,2.47L22.5,2.47L22.5,97.53Z';
const p1 = 'M0,100 C30,100 10,60 40,60'; // outside to inside
const p2 = 'M60,40 C90,40 70,0 100,0';   // inside to outside
let   p3 = 'M0,0 C30,0 70,100 100,100';  // outside to outside

let dynamic_p3 = DYNAMIC_P3;

// Parse SVG path to a structured format
function parse_path(d) {
  const parts = d.split(/([MLCcZ])/g);
  const out = [];
  let cmd = [null, null];
  for (let p of parts) {
    if (p === '') { /* nop */ }
    else if ('MLCcZ'.includes(p)) {
      cmd[0] = p;
    } else {
      cmd[1] = p.split(/[, ]/g).map(parseFloat);
      
      out.push(cmd);
      cmd = [null, null];
    }
  }
  return out;
}

// Draw a path given by SVG path data.
// Note: Fill not supported.
function path(d) {
  const cmds = parse_path(d);
  let p = [0, 0]; // current point
  for (let cmd of cmds) {
    if (cmd[0] == "M") {
      p = cmd[1].slice(0, 2);
    } else if (cmd[0] == "L") {
      let q = cmd[1].slice(0, 2);
      line(...p, ...q);
      p = q;
    } else if (cmd[0] == "C") {
      bezier(...p, ...cmd[1].slice(0, 6));
      p = cmd[1].slice(4, 6);
    } else if (cmd[0] == "c") {
      bezier(...p,  p[0] + cmd[1][0], p[1] + cmd[1][1], p[0] + cmd[1][2], p[1] + cmd[1][3], p[0] + cmd[1][4], p[1] + cmd[1][5] );
      p = [ p[0] + cmd[1][4], p[1] + cmd[1][5] ];
    }
  }
}
function line2path(l) {
  function s(num) {
    return num.toFixed(2);
  }
  return `M${s(l[0])},${s(l[1])}L${s(l[2])},${s(l[3])}`;
}

// Return d clipped by clip_d. Returns an array of path data strings.
// Supports only single open paths for d.
function clip_(d, clip_d) {
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
  const stops = [ first_loc, ...p.getCrossings(clip), last_loc ];
  let inside = clip.contains(first_loc.point);
  for (let i=1; i<stops.length; i++) {
    const rest = p.splitAt( stops[i] ); // p is now shorter
    if (!inside) {
      out.push( p.pathData );
    }
    p = rest;
    inside = !inside;
  }
  return out;
}


function setup() {
  createCanvas(400, 400);
  paper.setup();
}

let mx = 0;
let my = 0;

function draw() {
  background(220);
  noFill();
  translate(width/2-50, height/2-50);
  
  if (dynamic_p3) {
    const x = mouseX - width/2 + 50; 
    const y = mouseY - height/2 + 50;
    p3 = 'M' + mx + ',' + my + ' ' + p3.split(' ').slice(1, -1).join(' ') + ' ' + x + ',' + y;
  }
  
  stroke(0);
  path(Dmask);
  path(p1);
  path(p2);
  path(p3);
  
  let parts;
  stroke(0,255,0);
  parts = clip_(p1, Dmask);
  parts.forEach(path);
  
  stroke(0,0,255);
  parts = clip_(p2, Dmask);
  parts.forEach(path);
  
  stroke(255,0,0);
  parts = clip_(p3, Dmask);
  parts.forEach(path);
  
  // noLoop();
}

function mousePressed() {
  mx = mouseX - width/2 + 50; 
  my = mouseY - height/2 + 50;
}

function keyPressed() {
  if (key == ' ') {
    dynamic_p3 = !dynamic_p3;
  }
}