const { v4: uuidv4 } = require('uuid');

class Bullet {
    constructor(x, y, vx, vy, owner) {
        this.id = uuidv4();
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.speed = 20;
        this.size = 10; // Assuming default bullet width
        this.owner = owner;
        this.damage = 100;
        this.bounces = 3;
    }

    move() {
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);
    }
}

module.exports = Bullet;