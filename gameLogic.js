const SAT = require('sat');

const lerp = (start, end, amount) => {
    return (1 - amount) * start + amount * end;
};

const rLerp = (A, B, w) => {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
};

const checkCollision = (player, tile, tileSize) => {
    let playerRect = new SAT.Box(new SAT.Vector(player.x, player.y), player.hitboxWidth, player.hitboxHeight).toPolygon();
    let tileRect = new SAT.Box(new SAT.Vector(tile.x, tile.y), tileSize, tileSize).toPolygon();

    let response = new SAT.Response();
    let collided = SAT.testPolygonPolygon(playerRect, tileRect, response);

    if (collided) {
        // Adjust the player's position to prevent collision
        player.x -= response.overlapV.x;
        player.y -= response.overlapV.y;
    }
};

const updateMovement = (gameState, movementQueue, gameMap, tileSize) => {
    for (const playerId in movementQueue) {
        const playerMovement = movementQueue[playerId];
        let player = gameState.players[playerId];

        if (!player) continue; // Ensure player exists in gameState

        let rotationSpeed = 0.3; // Adjust the rotation speed as needed

        // Calculate the movement direction based on the player's inputs
        let movementDirection = { x: 0, y: 0 };
        if (playerMovement.left) {
            movementDirection.x -= player.moveSpeed;
            player.angle = rLerp(player.angle, Math.PI, rotationSpeed); // Rotate left
        }
        if (playerMovement.right) {
            movementDirection.x += player.moveSpeed;
            player.angle = rLerp(player.angle, 0, rotationSpeed); // Rotate right
        }
        if (playerMovement.up) {
            movementDirection.y -= player.moveSpeed;
            player.angle = rLerp(player.angle, -Math.PI / 2, rotationSpeed); // Rotate up
        }
        if (playerMovement.down) {
            movementDirection.y += player.moveSpeed;
            player.angle = rLerp(player.angle, Math.PI / 2, rotationSpeed); // Rotate down
        }

        // Normalize the movement vector if moving diagonally
        let movementMagnitude = Math.sqrt(movementDirection.x ** 2 + movementDirection.y ** 2);
        if (movementMagnitude > player.moveSpeed) {
            let factor = player.moveSpeed / movementMagnitude;
            movementDirection.x *= factor;
            movementDirection.y *= factor;
        }

        // Apply the movement
        player.x += movementDirection.x;
        player.y += movementDirection.y;

        if (playerMovement.mouseAngle) {
            player.turretAngle = playerMovement.mouseAngle;
        }

        // Check collision with tiles
        for (let i = 0; i < gameMap.length; i++) {
            for (let j = 0; j < gameMap[i].length; j++) {
                if (gameMap[i][j] === 1) {
                    let tile = {
                        x: j * tileSize,
                        y: i * tileSize
                    };
                    checkCollision(player, tile, tileSize);
                }
            }
        }
    }
    movementQueue = {}; // Clear the movement queue after processing
};



// Function to check collision between a bullet and a player
const checkBulletPlayerCollision = (bullet, player) => {
    const bulletCircle = new SAT.Circle(new SAT.Vector(bullet.x, bullet.y), bullet.size / 2);
    let playerRect = new SAT.Box(new SAT.Vector(player.x, player.y), player.hitboxWidth, player.hitboxHeight).toPolygon();

    const response = new SAT.Response();
    const collided = SAT.testCirclePolygon(bulletCircle, playerRect, response);

    if (collided && bullet.owner !== player.id) {
        player.health -= bullet.damage;
        return true;
    }

    return false;
};


// Function to check collision between a bullet and a tile
const checkBulletTileCollision = (bullet, tile) => {
    const bulletCircle = new SAT.Circle(new SAT.Vector(bullet.x, bullet.y), bullet.size / 2);
    const tileRect = new SAT.Box(new SAT.Vector(tile.x, tile.y), tile.width, tile.height).toPolygon();

    const response = new SAT.Response();
    const collided = SAT.testCirclePolygon(bulletCircle, tileRect, response);

    if (collided) {
        // Reflect the bullet's velocity vector
        const normal = response.overlapN;
        const dot = bullet.vx * normal.x + bullet.vy * normal.y;
        bullet.vx -= 2 * dot * normal.x;
        bullet.vy -= 2 * dot * normal.y;
    }

    return collided;
};


const updateBullets = (gameState, gameMap, tileSize) => {
    const bulletsToRemove = [];

    for (const bulletId in gameState.bullets) {
        let bullet = gameState.bullets[bulletId];
        //update bullet position
        bullet.x += bullet.vx * bullet.speed;
        bullet.y += bullet.vy * bullet.speed;

        // Check collision with players
        for (const playerId in gameState.players) {
            const player = gameState.players[playerId];
            if (checkBulletPlayerCollision(bullet, player)) {
                bulletsToRemove.push(bulletId);
                break; // Exit the loop if bullet collided with a player
            }
        }

        // Check collision with tiles
        for (let j = 0; j < gameMap.length; j++) {
            for (let k = 0; k < gameMap[j].length; k++) {
                if (gameMap[j][k] === 1) { // Assuming 1 represents a tile
                    const tile = {
                        x: k * tileSize,
                        y: j * tileSize,
                        width: tileSize,
                        height: tileSize
                    };
                    if (checkBulletTileCollision(bullet, tile)) {
                        if (bullet.bounces <= 0) {
                            bulletsToRemove.push(bulletId);
                        }
                        bullet.bounces -= 1;
                        break; // Exit the loop if bullet collided with a tile
                    }
                }
            }
        }

        // Check if bullet is out of bounds
        if (bullet.x < 0 || bullet.x > gameMap[0].length * tileSize ||
            bullet.y < 0 || bullet.y > gameMap.length * tileSize) {
            bulletsToRemove.push(bulletId);
        }
    }

    // Remove collided or out-of-bounds bullets
    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
        delete gameState.bullets[bulletsToRemove[i]]
    }
};


module.exports = {
    updateMovement,
    updateBullets
};