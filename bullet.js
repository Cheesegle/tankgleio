const { v4: uuidv4 } = require('uuid');

class Bullet {
    constructor(x, y, vx, vy, owner, speed, size, damage, bounces, team) {
        this.id = uuidv4();
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.speed = speed;
        this.size = size;
        this.owner = owner;
        this.damage = damage;
        this.bounces = bounces;
        this.team = team;
    }

    move() {
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);
    }
}

module.exports = Bullet;