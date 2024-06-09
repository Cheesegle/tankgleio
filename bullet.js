const { v4: uuidv4 } = require('uuid');

class Bullet {
    constructor(x, y, angle, speed, owner) {
        this.id = uuidv4();
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.width = 10; // Assuming default bullet width
        this.height = 10; // Assuming default bullet height
        this.owner = owner;
    }

    move() {
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);
    }
}

module.exports = Bullet;