class Player {
    constructor(x, y, angle, turretAngle, color, turretColor, id, username, tankType = 'normal') {
        this.x = x || 0;
        this.y = y || 0;
        this.angle = angle || 0;
        this.turretAngle = turretAngle || 0;
        this.color = color || 'red';
        this.turretColor = turretColor || 'gray';
        this.id = id;
        this.username = username;
        this.bullets = [];
        this.tankType = tankType;

        // Set properties based on the tank type
        switch (tankType) {
            case 'big':
                this.width = 86;
                this.height = 66;
                this.hitboxWidth = 76;
                this.hitboxHeight = 76;
                this.moveSpeed = 7;
                this.maxHealth = 250;
                this.mineCooldown = 5000;
                this.shootCooldown = 500;
                this.bulletSpeed = 20;
                this.bulletSize = 20;
                this.bulletdamage = 200;
                break;
            case 'mineLayer':
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 8;
                this.maxHealth = 100;
                this.mineCooldown = 2000;
                this.shootCooldown = 500;
                this.bulletSpeed = 20;
                this.bulletSize = 10;
                this.bulletdamage = 50;
                break;
            case 'sniper':
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 9;
                this.maxHealth = 80;
                this.mineCooldown = 5000;
                this.shootCooldown = 1500;
                this.bulletSpeed = 40;
                this.bulletSize = 10;
                this.bulletdamage = 100;
                break;
            case 'normal':
            default:
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 10;
                this.maxHealth = 100;
                this.mineCooldown = 5000;
                this.shootCooldown = 500;
                this.bulletSpeed = 20;
                this.bulletSize = 10;
                this.bulletdamage = 100;
                break;
        }

        this.health = this.maxHealth;
    }

    respawn(spawnLocations) {
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        this.x = spawnLocation.x;
        this.y = spawnLocation.y;
        this.health = this.maxHealth;
    }
}

module.exports = Player;