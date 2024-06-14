class Player {
    constructor(x, y, angle, turretAngle, id, username, tankType = 'normal', team, score = 0) {
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
        this.stun = 0;
        this.score = score;
        this.dead = false;

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
                this.shotStunTime = 10;
                this.color = '#5865F2';
                break;
            case 'sniper':
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 9;
                this.maxHealth = 90; // Reduced health
                this.mineCooldown = 5000;
                this.shootCooldown = 2400; // Reduced shoot cooldown
                this.bulletSpeed = 35; // Increased bullet speed
                this.bulletSize = 10;
                this.bulletDamage = 190;
                this.regenRate = 2;
                this.bulletBounces = 1; // Reduced bullet bounces
                this.shotStunTime = 8;
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
                this.bulletDamage = 50; 
                this.regenRate = 3;
                this.bulletBounces = 2;
                this.shotStunTime = 2;
                this.color = '#FFFFFF';
                break;
            case 'healer':
                this.width = 43;
                this.height = 33;
                this.hitboxWidth = 38;
                this.hitboxHeight = 38;
                this.moveSpeed = 10;
                this.maxHealth = 110;
                this.mineCooldown = 5000;
                this.shootCooldown = 700;
                this.bulletSpeed = 18;
                this.bulletSize = 10;
                this.bulletDamage = 45;
                this.regenRate = 4;
                this.bulletBounces = 2;
                this.healRate = 10; 
                this.shotStunTime = 2;
                this.color = '#77B255';
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
                this.shotStunTime = 2;
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