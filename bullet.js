const { v4: uuidv4 } = require('uuid');

class Bullet {
    constructor(x, y, angle, owner) {
        this.id = uuidv4();
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 20;
        this.width = 10; // Assuming default bullet width
        this.height = 10; // Assuming default bullet height
        this.owner = owner;
        this.damage = 50;
    }

    move() {
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);
    }
}

module.exports = Bullet;