// hatching
// TODO: order of generated lines (in sequence, not from inside out)

const SHOW_PATTERN = false ;
const BBOX    = [140, 100, 120, 200];
const SPACING = 5;
const ANGLE   = 90;
const D = "M22.5,97.53L49.253,97.53C63.784,97.53 71.932,91.555 76.141,79.876C79.129,71.592 80.215,60.592 80.215,50C80.215,39.408 79.129,28.408 76.141,20.124C71.932,8.445 63.784,2.47 49.253,2.47L22.5,2.47L22.5,97.53ZM44.228,77.16L44.228,22.84L49.253,22.84C52.376,22.84 54.414,24.877 55.636,28.272C57.537,33.568 57.808,43.074 57.808,50C57.808,56.926 57.537,66.432 55.636,71.728C54.414,75.123 52.376,77.16 49.253,77.16L44.228,77.16Z";

let show_pattern = SHOW_PATTERN;

function setup() {
  const renderer = createCanvas(400, 400);
  paper.setup();
  noFill();
  ellipseMode(CENTER);
}

function hatch_pattern(bbox, spacing, angle) {
  let lines = [];
  
  function transform_line(line, matrix) {
    const p1 = matrix.transformPoint(new DOMPoint(line[0], line[1]));
    const p2 = matrix.transformPoint(new DOMPoint(line[2], line[3]));
    return [p1.x, p1.y, p2.x, p2.y];
  }
  
  // side length of patterns
  const a = Math.sqrt( bbox[2]**2 + bbox[3]**2 );
  // console.log(a);
  
  // center of pattern
  const cx = bbox[0] + bbox[2]/2;
  const cy = bbox[1] + bbox[3]/2;
  
  // center line
  lines.push([cx - a/2, cy, cx + a/2, cy]);
  // work outwards
  let r = spacing;
  while (r < a/2) {
    lines.push([cx - a/2, cy + r, cx + a/2, cy + r]);
    lines.push([cx - a/2, cy - r, cx + a/2, cy - r]);
    r += spacing;
  }
  
  // apply rotation
  const m = new DOMMatrix(); // identity
  m.translateSelf(cx, cy).rotateSelf(angle).translateSelf(-cx, -cy);
  lines = lines.map( l => transform_line(l, m) );
  return lines;
}

// Parse SVG path to a structured format
function parse_path(d) {
  const parts = d.split(/([MLCZ])/g);
  const out = [];
  let cmd = [null, null];
  for (let p of parts) {
    if (p === '') { /* nop */ }
    else if ('MLCZ'.includes(p)) {
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
    }
  }
}
function line2path(l) {
  function s(num) {
    return num.toFixed(2);
  }
  return `M${s(l[0])},${s(l[1])}L${s(l[2])},${s(l[3])}`;
}

function lines2path(lines) {
  return lines.map(line2path).join('');
}

function hatch(d, spacing, angle) {
  const p = new paper.CompoundPath(d);
  const bbox = [p.bounds.x, p.bounds.y, p.bounds.width, p.bounds.height];
  
  const lines = hatch_pattern(bbox, spacing, angle);
  out = [];
  for (let l of lines) {
    const pline = new paper.Path.Line(...l)
    const inter = pline.getCrossings(p);
    for (let i=1; i<inter.length; i+=2) {
      const a = inter[i-1];
      const b = inter[i];
      out.push([a.point.x, a.point.y, b.point.x, b.point.y]);
    }
  }
  return out;
}

function draw() {
  const spacing = map(mouseY, 0, width, 1, 20);
  const angle = map(mouseX, 0, height, 0, 180);
  // const spacing = SPACING;
  // const angle = ANGLE;
  
  background(220);
  translate(width/2 - 50, height/2 - 50);
  
  
  stroke(0);
  if (show_pattern) {
    const p = new paper.CompoundPath(D);
    const bbox = [p.bounds.x, p.bounds.y, p.bounds.width, p.bounds.height];
    const pattern = hatch_pattern(bbox, spacing, angle);
    path( lines2path(pattern) );
  }
  
  path(D);
  
  if (show_pattern) {
    stroke(255,0,0);
  }
  const lines = hatch(D, spacing, angle);
  path( lines2path(lines) );

  // noLoop();
  
}

function keyPressed() {
  if (key == ' ') {
      show_pattern = !show_pattern;
  }
}