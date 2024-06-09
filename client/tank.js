class Tank {
    constructor(x, y, angle, turretAngle, color, turretColor) {
        this.width = 43;
        this.height = 33;
        this.turretBaseSide = 19;
        this.turretNozzleWidth = 21;
        this.turretNozzleHeight = 10;

        this.x = x;
        this.y = y;
        this.angle = angle;
        this.turretAngle = turretAngle;
        this.color = color;
        this.turretColor = turretColor;
        this.dead = false;
    }

    render() {
        push();

        translate(this.x + this.width / 2, this.y + this.height / 2);
        rotate(this.angle);

        // Draw tank body
        fill(this.color);
        rectMode(CENTER);
        rect(0, 0, this.width, this.height);

        // Draw tank turret
        push();
        rotate(this.turretAngle - this.angle);
        fill(this.turretColor);
        rectMode(CENTER);
        rect(0, 0, this.turretBaseSide, this.turretBaseSide);
        rect(this.turretBaseSide / 2, 0, this.turretNozzleWidth, this.turretNozzleHeight);
        pop();

        pop();
    }
}
