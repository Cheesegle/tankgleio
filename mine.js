const { v4: uuidv4 } = require('uuid');

class Mine {
    constructor(x, y, owner) {
        this.id = uuidv4();
        this.x = x;
        this.y = y;
        this.explodeRadius = 200;
        this.size = 20;
        this.owner = owner;
        this.damage = 300;
        this.timeleft = 5 * 20; // Timeleft is in ticks (20 ticks per second)
    }

    explode(gameState) {
        // Apply damage to nearby players within explosion radius
        for (const playerId in gameState.players) {
            const player = gameState.players[playerId];
            const distanceSquared = (player.x - this.x) ** 2 + (player.y - this.y) ** 2;
            const distance = Math.sqrt(distanceSquared);
            if (distance <= this.explodeRadius) {
                player.health -= this.damage;
            }
        }
        // Remove the mine from the game state
        delete gameState.mines[this.id];
    }
}

module.exports = Mine;
