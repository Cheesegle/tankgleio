class Player {
    constructor(x, y, angle, turretAngle, id, username, tankType = 'normal', team) {
        this.x = x || 0;
        this.y = y || 0;
        this.angle = angle || 0;
        this.turretAngle = turretAngle || 0;
        this.turretColor = 'gray';
        this.id = id;
        this.username = username;
        this.bullets = [];
        this.tankType = tankType;
        this.team = team;

        // Set properties based on the tank type
        switch (tankType) {
            case 'big':
                this.width = 86;
                this.height = 66;
                this.hitboxWidth = 76;
                this.hitboxHeight = 76;
                this.moveSpeed = 7;
                this.maxHealth = 200; // Reduced health for balance
                this.mineCooldown = 6000; // Slower mine cooldown
                this.shootCooldown = 800; // Slower shooting
                this.bulletSpeed = 15; // Slower bullets
                this.bulletSize = 20;
                this.bulletDamage = 150; // Reduced damage
                this.regenRate = 2; // Slightly higher regeneration rate
                this.bulletBounces = 2;
                this.color = '#5865F2';
                break;
            case 'mineLayer':
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 9; // Slightly faster
                this.maxHealth = 130; // Slightly increased health
                this.mineCooldown = 2000; // Faster mine cooldown
                this.shootCooldown = 600; // Balanced shooting
                this.bulletSpeed = 18; // Balanced bullet speed
                this.bulletSize = 10;
                this.bulletDamage = 60; // Balanced damage
                this.regenRate = 3; // Higher regeneration rate
                this.bulletBounces = 4; // Increased bullet bounces
                this.color = '#FEE75C';
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
                this.bulletSpeed = 30; // Reduced bullet speed
                this.bulletSize = 10;
                this.bulletDamage = 120; // Reduced damage
                this.regenRate = 2; // Slightly higher regeneration rate
                this.bulletBounces = 2;
                this.color = '#ED4245';
                break;
            case 'speedy':
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 15; // Higher speed
                this.maxHealth = 70; // Lower health
                this.mineCooldown = 5000;
                this.shootCooldown = 600; // Balanced shooting speed
                this.bulletSpeed = 25; // Faster bullets
                this.bulletSize = 10;
                this.bulletDamage = 80; // Moderate damage
                this.regenRate = 3; // Higher regeneration rate
                this.bulletBounces = 2;
                this.color = '#FFFFFF';
                break;
            case 'normal':
            default:
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 10;
                this.maxHealth = 110;
                this.mineCooldown = 5000;
                this.shootCooldown = 500;
                this.bulletSpeed = 20;
                this.bulletSize = 10;
                this.bulletDamage = 100;
                this.regenRate = 2; // Slightly higher regeneration rate for balance
                this.bulletBounces = 2;
                this.color = '#E67E22';
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