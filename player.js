class Player {
    constructor(x, y, angle, turretAngle, color, turretColor, id) {
        this.x = x || 0;
        this.y = y || 0;
        this.angle = angle || 0;
        this.turretAngle = turretAngle || 0;
        this.color = color || 'red';
        this.turretColor = turretColor || 'gray';
        this.width = 43;
        this.height = 33;
        this.hitboxWidth = 38;
        this.hitboxHeight = 38;
        this.moveSpeed = 8;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.bullets = [];
        this.id = id;
    }

    respawn(spawnLocations) {
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        this.x = spawnLocation.x;
        this.y = spawnLocation.y;
        this.health = this.maxHealth;
    }
}

module.exports = Player;