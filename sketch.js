let emmaScore = 0;
let nateScore = 0;
let resetButton;
let emmaColor;
let nateColor;
let canScore = true;
let cooldownTime = 150; // milliseconds
let fireworks = [];
let celebrating = false;
let lastWinner = '';
let fireTime = 200;
let baseTextSize;
let titleTextSize;
let scoreTextSize;
let buttonTextSize;

// Jiggle state per side (milliseconds)
let emmaJiggleStart = 0;
let nateJiggleStart = 0;
const JIGGLE_DURATION = 5000; // 5 seconds in ms

// Increased amplitude for more noticeable jiggle
const JIGGLE_AMPLITUDE_FACTOR = 0.06; // fraction of min(width,height)
const JIGGLE_MAX_ROTATION = 0.08; // radians (~4.5 degrees)

// Pattern alpha (opacity) for both side patterns (0 = fully transparent, 255 = fully opaque).
// Opacity (alpha) controls transparency: lower values let background show through; higher values make elements more solid.
const PATTERN_ALPHA = 200; // semi-opaque as requested

// Nate zigzag stroke weight (pixels) - higher = thicker zigzags
const NATE_ZIG_WEIGHT = 12;

// Emma dot spread multiplier: >1 spreads dots further apart (fewer dots).
// Increase to make dots more sparse; decrease toward 1 for denser packing.
// Raised to a large value to place very few, widely spaced dots.
const EMMA_SPREAD = 300.0;

// Randomized dots for Emma's side (normalized coordinates 0..1)
let emmaDots = [];

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = random(-8, 8);
    this.vy = random(-15, -5);
    this.alpha = 255;
    this.size = random(4, 12);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2;
    this.alpha -= 2;
    return this.alpha > 0;
  }

  draw() {
    noStroke();
    const c = color(this.color);
    c.setAlpha(this.alpha);
    fill(c);
    ellipse(this.x, this.y, this.size, this.size);
  }
}

class Firework {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.particles = [];
    this.addParticles();
  }

  addParticles() {
    for (let i = 0; i < 24; i++) {
      this.particles.push(new Particle(this.x, this.y, this.color));
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.update()) {
        this.particles.splice(i, 1);
      }
    }
    return this.particles.length > 0;
  }

  draw() {
    for (const particle of this.particles) {
      particle.draw();
    }
  }
}

class Button {
  constructor(x, y, w, h, text) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.text = text;
  }
  
  display() {
    push();
    if (this.isMouseOver()) {
      fill(180);
    } else {
      fill(200);
    }
    stroke(0);
    rect(this.x, this.y, this.w, this.h, 5);
    fill(0);
    noStroke();
    textSize(buttonTextSize);
    textAlign(CENTER, CENTER);
    text(this.text, this.x + this.w/2, this.y + this.h/2);
    pop();
  }
  
  isMouseOver() {
    return mouseX > this.x && mouseX < this.x + this.w && 
           mouseY > this.y && mouseY < this.y + this.h;
  }
}

function calculateResponsiveSizes() {
  // Base sizes off viewport
  baseTextSize = min(width, height) * 0.02;
  titleTextSize = min(width, height) * 0.05;
  scoreTextSize = min(width, height) * 0.35;
  buttonTextSize = min(width, height) * 0.04;
}

function drawDotsBackground(x, y, w, h, col) {
  push();
  noStroke();
  fill(col);
  const spacing = max(8, min(w, h) * 0.03);
  // Larger dot diameter for better visibility
  const dotDiameter = spacing * 2.0;

  // If we're drawing the left half and have randomized dots, use them.
  if (x === 0 && emmaDots && emmaDots.length > 0) {
    for (const p of emmaDots) {
      const dx = x + constrain(p.x * w, spacing/2, w - spacing/2);
      const dy = y + constrain(p.y * h, spacing/2, h - spacing/2);
      ellipse(dx, dy, dotDiameter, dotDiameter);
    }
  } else {
    // fallback grid (also uses larger dots)
    for (let yy = y + spacing / 2; yy < y + h; yy += spacing) {
      for (let xx = x + spacing / 2; xx < x + w; xx += spacing) {
        ellipse(xx, yy, dotDiameter, dotDiameter);
      }
    }
  }
  pop();
}

function drawZigzagBackground(x, y, w, h, col) {
  push();
  noFill();
  stroke(col);
  // Increase stroke weight to make each line noticeably thicker while still
  // scaling with canvas size. Use NATE_ZIG_WEIGHT as a base if present.
  const baseWeight = (typeof NATE_ZIG_WEIGHT !== 'undefined') ? NATE_ZIG_WEIGHT : 2;
  // Multiply base weight by 1.8 to achieve the requested thicker appearance,
  // but also ensure it scales with very large canvases.
  strokeWeight(max(1, floor(baseWeight * 1.8), floor(min(w, h) * 0.003)));

  // Determine the current finer step used previously and compute rows.
  const previousStep = max(16, min(w, h) * 0.04);
  const currentRows = max(1, floor(h / previousStep));

  // Target half the number of zig-zag lines (ceil to ensure at least one row).
  const desiredRows = max(1, Math.ceil(currentRows / 2));

  // Compute a step that fills the region with the desired number of rows.
  const step = h / desiredRows;

  // Keep amplitude proportional so zigs remain proportional and not too tall.
  const amplitude = step / 4;

  // Draw exactly desiredRows zig lines, evenly spaced to fill the area.
  for (let i = 0; i < desiredRows; i++) {
    const yy = y + (i + 0.5) * step;
    beginShape();
    let dir = 1;
    // Use a horizontal step equal to the computed vertical step so zigs remain balanced.
    for (let xx = x; xx <= x + w; xx += step) {
      vertex(xx, yy + (dir * amplitude));
      dir *= -1;
    }
    endShape();
  }
  pop();
}

// Compute smooth jiggle offset and rotation for a side; resets after duration.
function getJiggleOffset(side) {
  const start = (side === 'emma') ? emmaJiggleStart : nateJiggleStart;
  if (!start) return {x: 0, y: 0, angle: 0};

  const elapsed = millis() - start;
  if (elapsed > JIGGLE_DURATION) {
    if (side === 'emma') emmaJiggleStart = 0;
    else nateJiggleStart = 0;
    return {x: 0, y: 0, angle: 0};
  }

  // Perlin noise-driven motion (smooth). Faster scale for lively jiggle.
  const t = millis() * 0.006;
  const amp = min(width, height) * JIGGLE_AMPLITUDE_FACTOR;
  const nx = noise(t + (side === 'emma' ? 0 : 100));
  const ny = noise(t + (side === 'emma' ? 200 : 300));
  const na = noise(t + (side === 'emma' ? 400 : 500));

  const ox = (nx - 0.5) * 2 * amp;
  const oy = (ny - 0.5) * 2 * amp;
  const angle = (na - 0.5) * 2 * JIGGLE_MAX_ROTATION;

  return {x: ox, y: oy, angle};
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  calculateResponsiveSizes();

  // Adjust button based on size
  let buttonWidth = min(150, width * 0.3);
  let buttonHeight = min(60, height * 0.1);
  resetButton = new Button(
    width/2 - buttonWidth/2,
    height/2 + buttonHeight/3,
    buttonWidth,
    buttonHeight,
    "Reset"
  );

  // Yellow background with green patterns (same opacity)
  emmaColor = color(0, 200, 0, PATTERN_ALPHA);
  nateColor = color(0, 150, 0, PATTERN_ALPHA);

  // initial randomized dots for Emma
  generateEmmaDots();
}

function checkWinner() {
  if (emmaScore >= 15 && !celebrating) {
    celebrating = true;
    lastWinner = 'emma';
    createFireworks(width/4);
  } else if (nateScore >= 15 && !celebrating) {
    celebrating = true;
    lastWinner = 'nate';
    createFireworks(3 * width / 4);
  }
}

function createFireworks(x) {
  const colors = [
    '#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff00ff',
    '#00ffff', '#ff8800', '#ff0088', '#8800ff', '#ffffff',
    '#88ff00', '#0088ff', '#ff0044', '#00ff88', '#4400ff'
  ];

  const isLeftSide = x < width / 2;
  const minX = isLeftSide ? 0 : width / 2;
  const maxX = isLeftSide ? width / 2 : width;

  for (let i = 0; i < fireTime; i++) {
    setTimeout(() => {
      fireworks.push(new Firework(
        random(minX + 50, maxX - 50),
        random(50, height - 50),
        random(colors)
      ));
    }, i * 100);
  }
}

function draw() {
  // warm yellow canvas background
  background(255, 245, 120);

  // Draw backgrounds with jiggle transforms only (foreground stays fixed)
  noStroke();

  // Emma (left) background - pivot around left-side center for natural rotation
  const emmaOffset = getJiggleOffset('emma');
  push();
  const emmaCenterX = width / 4;
  const emmaCenterY = height / 2;
  translate(emmaCenterX + emmaOffset.x, emmaCenterY + emmaOffset.y);
  rotate(emmaOffset.angle);
  translate(-emmaCenterX, -emmaCenterY);
  drawDotsBackground(0, 0, width / 2, height, emmaColor);
  pop();

  // Nate (right) background
  const nateOffset = getJiggleOffset('nate');
  push();
  const nateCenterX = 3 * width / 4;
  const nateCenterY = height / 2;
  translate(nateCenterX + nateOffset.x, nateCenterY + nateOffset.y);
  rotate(nateOffset.angle);
  translate(-nateCenterX, -nateCenterY);
  drawZigzagBackground(width / 2, 0, width / 2, height, nateColor);
  pop();

  // Foreground text and scores (fixed, not affected by jiggle)
  fill(0);
  textSize(titleTextSize);
  text("Emma", width / 4, height / 6);
  text("Nate", 3 * width / 4, height / 6);

  textSize(scoreTextSize);
  text(emmaScore, width / 4, height * 0.7);
  text(nateScore, 3 * width / 4, height * 0.7);

  resetButton.display();

  // Update/draw fireworks
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].draw();
    if (!fireworks[i].update()) {
      fireworks.splice(i, 1);
    }
  }

  checkWinner();
}

function mousePressed() {
  if (resetButton.isMouseOver()) {
    emmaScore = 0;
    nateScore = 0;
    celebrating = false;
    lastWinner = '';
    fireworks = [];
    generateEmmaDots();
    return;
  }

  if (canScore && !celebrating) {
    if (mouseX < width / 2) {
      emmaScore += 1;
      // start/restart jiggle for Emma exactly JIGGLE_DURATION ms
      emmaJiggleStart = millis();
      // change dot layout each Emma score
      generateEmmaDots();
      canScore = false;
      setTimeout(() => { canScore = true; }, cooldownTime);
    } else if (mouseX > width / 2) {
      nateScore += 1;
      nateJiggleStart = millis();
      canScore = false;
      setTimeout(() => { canScore = true; }, cooldownTime);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateResponsiveSizes();

  // Recreate reset button adjusted to new size
  let buttonWidth = min(150, width * 0.3);
  let buttonHeight = min(60, height * 0.1);
  resetButton = new Button(
    width/2 - buttonWidth/2,
    height/2 + buttonHeight/3,
    buttonWidth,
    buttonHeight,
    "Reset"
  );

  // regenerate dots so layout fits new dimensions
  generateEmmaDots();
}

/*
  Poisson-disk sampling implementation (Bridson's algorithm) and integrated generator.

  poissonDiskSamples(maxPoints, radius, margin, seed, x, y, w, h)
    - Returns up to maxPoints positions [{x,y}, ...] inside rectangle (x,y,w,h)
      with pairwise distance >= 2*radius + margin.
    - Uses a simple seeded PRNG (Mulberry32) when seed is provided for reproducibility.
    - Falls back to Math.random when seed is undefined.
    - Efficient: uses spatial grid acceleration and k attempts per active sample.

  generateEmmaDots()
    - Calls poissonDiskSamples with a target number computed from area/spacing.
    - Stores normalized coordinates (0..1 relative to left-half) in global emmaDots.
    - If the sampler cannot place the requested number, it returns as many as fit.
*/

// Poisson-disk sampler (Bridson) with optional seed for reproducibility.
function poissonDiskSamples(maxPoints, radius, margin, seed, x, y, w, h) {
  // Simple seeded PRNG (Mulberry32) for deterministic runs when seed provided.
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const rng = (typeof seed === 'number') ? mulberry32(seed) : Math.random;

  const minDist = 2 * radius + (margin || 0);
  if (minDist <= 0) {
    // trivial: fill randomly
    const pts = [];
    for (let i = 0; i < maxPoints; i++) pts.push({ x: x + w * rng(), y: y + h * rng() });
    return pts;
  }

  const k = 30; // attempts per active point
  const cellSize = minDist / Math.SQRT2;

  const gridCols = Math.max(1, Math.ceil(w / cellSize));
  const gridRows = Math.max(1, Math.ceil(h / cellSize));
  const grid = new Int32Array(gridCols * gridRows);
  for (let i = 0; i < grid.length; i++) grid[i] = -1;

  const samples = [];
  const active = [];

  function gridIndex(px, py) {
    const gx = Math.floor((px - x) / cellSize);
    const gy = Math.floor((py - y) / cellSize);
    if (gx < 0 || gy < 0 || gx >= gridCols || gy >= gridRows) return -1;
    return gx + gy * gridCols;
  }

  function isValid(nx, ny) {
    const gx = Math.floor((nx - x) / cellSize);
    const gy = Math.floor((ny - y) / cellSize);
    const startX = Math.max(0, gx - 2);
    const endX = Math.min(gridCols - 1, gx + 2);
    const startY = Math.max(0, gy - 2);
    const endY = Math.min(gridRows - 1, gy + 2);
    const minDistSq = minDist * minDist;
    for (let yy = startY; yy <= endY; yy++) {
      for (let xx = startX; xx <= endX; xx++) {
        const gi = xx + yy * gridCols;
        const si = grid[gi];
        if (si !== -1) {
          const p = samples[si];
          const dx = p.x - nx;
          const dy = p.y - ny;
          if (dx * dx + dy * dy < minDistSq) return false;
        }
      }
    }
    return true;
  }

  // Seed initial sample(s)
  // Try a few times to get an initial valid point inside bounds.
  let seedTries = 0;
  while (samples.length === 0 && seedTries < 10) {
    seedTries++;
    const sx = x + rng() * w;
    const sy = y + rng() * h;
    if (isValid(sx, sy) || samples.length === 0) {
      const gi = gridIndex(sx, sy);
      samples.push({ x: sx, y: sy });
      if (gi >= 0) grid[gi] = samples.length - 1;
      active.push(samples.length - 1);
    }
  }

  // Main Bridson loop
  while (active.length > 0 && samples.length < maxPoints) {
    const aIndex = Math.floor(rng() * active.length);
    const sampleIndex = active[aIndex];
    const s = samples[sampleIndex];

    let placed = false;
    for (let i = 0; i < k; i++) {
      const angle = 2 * Math.PI * rng();
      const radiusRand = minDist * (1 + rng()); // between minDist and 2*minDist
      const nx = s.x + Math.cos(angle) * radiusRand;
      const ny = s.y + Math.sin(angle) * radiusRand;

      // candidate must lie fully within rectangle (respect dot radius)
      if (nx < x + radius || ny < y + radius || nx > x + w - radius || ny > y + h - radius) continue;
      if (isValid(nx, ny)) {
        const gi = gridIndex(nx, ny);
        samples.push({ x: nx, y: ny });
        if (gi >= 0) grid[gi] = samples.length - 1;
        active.push(samples.length - 1);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // deactivate this sample
      active.splice(aIndex, 1);
    }
  }

  // Trim to requested count (shouldn't usually be larger)
  if (samples.length > maxPoints) samples.length = maxPoints;
  return samples;
}

// Generate Emma's dots using Poisson-disk sampling to guarantee no overlaps.
// Stores normalized positions (0..1) in emmaDots for compatibility with drawDotsBackground().
function generateEmmaDots() {
  const wHalf = width / 2;
  const hFull = height;
  const spacing = max(8, min(wHalf, hFull) * 0.03);
  // Use a much larger size for more prominent dots
  const dotDiameter = spacing * 2.0;
  const radius = dotDiameter / 2;
  const margin = 4; // extra gap in pixels between dots (larger to match bigger dots)

  const area = wHalf * hFull;
  const approx = floor(area / (spacing * spacing) * 0.6);
  const target = max(12, approx);

  // Use a seed based on frame count + millis so it's different each call but reproducible per call if needed.
  const seed = Math.floor(random(0, 1) * 1e9);

  // Request up to 'target' samples in the left-half rectangle (0,0,wHalf,hFull)
  const pts = poissonDiskSamples(target, radius, margin, seed, 0, 0, wHalf, hFull);

  // Convert to normalized coordinates for drawing routine
  emmaDots = pts.map(p => ({ x: p.x / wHalf, y: p.y / hFull }));
}