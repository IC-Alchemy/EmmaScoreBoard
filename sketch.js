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
let baseTextSize;
let titleTextSize;
let scoreTextSize;
let buttonTextSize;

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
  // Base sizes off viewport width
  baseTextSize = min(width, height) * 0.02;  // 3% of smallest screen dimension
  titleTextSize = min(width, height) * 0.05;  // 5% of smallest screen dimension
  scoreTextSize = min(width, height) * 0.35;  // 15% of smallest screen dimension
  buttonTextSize = min(width, height) * 0.04;  // 4% of smallest screen dimension
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  calculateResponsiveSizes();
  
  // Adjust button size based on screen size
  let buttonWidth = min(150, width * 0.3); // Either 150px or 30% of width
  let buttonHeight = min(60, height * 0.1); // Either 60px or 10% of height
  resetButton = new Button(
    width/2 - buttonWidth/2, 
    height/2 + buttonHeight/3, 
    buttonWidth, 
    buttonHeight, 
    "Reset"
  );
  
  emmaColor = color(0, 128, 128, 100);
  nateColor = color(255, 0, 0, 100);
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
  textSize(titleTextSize);
  
  // Break text into multiple lines on small screens

    text("Emma", width/4, height/6);
 //   text("and", width/4, height/6 + titleTextSize);
   // text("Arcade", width/4, height/6 + titleTextSize * 2);
  
  
  // Draw Emma's score lower on screen
  textSize(scoreTextSize);
  text(emmaScore, width/4, height * 0.7);
  
  // Draw Nate's name
  textSize(titleTextSize);
  
  // Break text into multiple lines on small screens

    text("Nana", 3*width/4, height/6);
  // text("and", 3*width/4, height/6 + titleTextSize);
   // text("Bowling", 3*width/4, height/6 + titleTextSize * 2);
  
  
  // Draw Nate's score lower on screen
  textSize(scoreTextSize);
  text(nateScore, 3*width/4, height * 0.7);
  
  resetButton.display();
  
  // Update and draw fireworks
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateResponsiveSizes();
  
  // Recalculate button position and size
  let buttonWidth = min(150, width * 0.3);
  let buttonHeight = min(60, height * 0.1);
  resetButton = new Button(
    width/2 - buttonWidth/2, 
    height/2 + buttonHeight/3, 
    buttonWidth, 
    buttonHeight, 
    "Reset"
  );
}
