class Tank {
  constructor(x, y, angle, turretAngle, color, turretColor, sideColor) {
    this.width = TANK_WIDTH;
    this.height = TANK_HEIGHT;
    this.turretBaseSide = 19;
    this.turretNozzleWidth = 21;
    this.turretNozzleHeight = 10;

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.turretAngle = turretAngle;
    this.color = color;
    this.turretColor = turretColor;
    this.sideColor = sideColor;
    this.dead = false;
  }

  render() {
    push();

    translate(this.centerX, this.centerY);
    rotate(this.angle);

    // Draw tank body
    fill(this.color);
    rectMode(CENTER);
    rect(0, 0, this.width, this.height);

    // Draw tank sides
    fill(this.sideColor);
    rectMode(CORNER);
    push();
    translate(-this.width / 2, -this.height / 2);
    for (let i = 0; i < 3; i++) {
      rect(0, 0, this.width, this.height / 5);
      translate(0, this.height / 2.5);
    }
    pop();

    // Draw tank turret
    push();
    rotate(this.turretAngle - this.angle);
    fill(this.turretColor);
    rect(0, 0, this.turretBaseSide, this.turretBaseSide);
    rect(0, 0, this.turretNozzleWidth, this.turretNozzleHeight);
    pop();

    pop();
  }
}
