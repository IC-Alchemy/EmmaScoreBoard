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
let fireTime=200;
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = random(-8, 8);
    this.vy = random(-15, -5);
    this.alpha = 255;
    this.size = random(8, 16);
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
    for (let i = 0; i < 100; i++) {
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
    textSize(32);
    textAlign(CENTER, CENTER);
    text(this.text, this.x + this.w/2, this.y + this.h/2);
    pop();
  }
  
  isMouseOver() {
    return mouseX > this.x && mouseX < this.x + this.w && 
           mouseY > this.y && mouseY < this.y + this.h;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textSize(32);
  resetButton = new Button(width/2 - 75, height/2 + 20, 150, 60, "Reset");
  emmaColor = color(0, 128, 128, 100); // Teal with transparency
  nateColor = color(255, 0, 0, 100);   // Red with transparency
}

function checkWinner() {
  if (emmaScore >= 10 && !celebrating) {
    celebrating = true;
    lastWinner = 'emma';
    // Create fireworks on Emma's side
    createFireworks(width/4);
  } else if (nateScore >= 10 && !celebrating) {
    celebrating = true;
    lastWinner = 'nate';
    // Create fireworks on Nate's side
    createFireworks(3*width/4);
  }
}

function createFireworks(x) {
  const colors = [
    '#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff00ff', 
    '#00ffff', '#ff8800', '#ff0088', '#8800ff', '#ffffff',
    '#88ff00', '#0088ff', '#ff0044', '#00ff88', '#4400ff'
  ];
  
  // Calculate the side boundaries
  const isLeftSide = x < width/2;
  const minX = isLeftSide ? 0 : width/2;
  const maxX = isLeftSide ? width/2 : width;
  
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
  background(220);
  
  // Draw background sections
  noStroke();
  fill(emmaColor);
  rect(0, 0, width/2, height);
  fill(nateColor);
  rect(width/2, 0, width/2, height);
  
  // Draw Emma's score and name
  fill(0);
  textSize(128);
  text(emmaScore, width/4, height/3);
  textSize(72);
  text("Emma and Arcade", width/4, height/3 - 100);
  
  // Draw Nate's score and name
  fill(0);
  textSize(128);
  text(nateScore, 3*width/4, height/3);
  textSize(72);
  text("Nate and Bowling", 3*width/4, height/3 - 100);
  
  // Display reset button
  resetButton.display();

  // Update and draw fireworks
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].draw();
    if (!fireworks[i].update()) {
      fireworks.splice(i, 1);
    }
  }

  // Check for winner
  checkWinner();
}

function mousePressed() {
  if (resetButton.isMouseOver()) {
    emmaScore = 0;
    nateScore = 0;
    celebrating = false;
    lastWinner = '';
    fireworks = [];
    return;
  }
  
  if (canScore && !celebrating) {
    if (mouseX < width/2) {
      emmaScore += 1;
      canScore = false;
      setTimeout(() => { canScore = true; }, cooldownTime);
    } else if (mouseX > width/2) {
      nateScore += 1;
      canScore = false;
      setTimeout(() => { canScore = true; }, cooldownTime);
    }
  }
}
