const SAT = require('sat');
const rbush = require('rbush');

var tileIndex = new rbush();
var bulletIndex = new rbush();
var playerIndex = new rbush();
var mineIndex = new rbush();

const lerp = (start, end, amount) => {
    return (1 - amount) * start + amount * end;
};

const rLerp = (A, B, w) => {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
};

const checkPlayerTileCollision = (player, tile, tileSize) => {
    let playerRect = new SAT.Box(new SAT.Vector(player.x, player.y), player.hitboxWidth, player.hitboxHeight).toPolygon();
    let tileRect = new SAT.Box(new SAT.Vector(tile.x, tile.y), tile.width, tile.height).toPolygon();

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
        if (player.stun <= 0) {
            player.x += movementDirection.x;
            player.y += movementDirection.y;
        } else {
            player.stun--;
        }

        if (playerMovement.mouseAngle) {
            player.turretAngle = playerMovement.mouseAngle;
        }

        const nearbyTiles = tileIndex.search({
            minX: player.x,
            minY: player.y,
            maxX: player.x + player.hitboxWidth,
            maxY: player.y + player.hitboxHeight
        });

        for (const tile of nearbyTiles) {
            const tileRect = tile.tile;
            checkPlayerTileCollision(player, tileRect);
        }
    }
    movementQueue = {}; // Clear the movement queue after processing
};

// Function to check collision between a bullet and a player
const checkBulletPlayerCollision = (bullet, player, gameState) => {
    const bulletCircle = new SAT.Circle(new SAT.Vector(bullet.x, bullet.y), bullet.size / 2);
    let playerRect = new SAT.Box(new SAT.Vector(player.x, player.y), player.hitboxWidth, player.hitboxHeight).toPolygon();

    const response = new SAT.Response();
    const collided = SAT.testCirclePolygon(bulletCircle, playerRect, response);

    if (collided && bullet.owner !== player.id && bullet.team !== player.team) {
        player.health -= bullet.damage;
        if (player.health <= 0) {
            gameState.players[bullet.owner].score += 10;
        }
        return true;
    }

    return false;
};

const initMap = (gameMap, tileSize) => {
    // Populate the spatial index with tile data
    for (let i = 0; i < gameMap.length; i++) {
        for (let j = 0; j < gameMap[i].length; j++) {
            if (gameMap[i][j] === 1) { // Assuming 1 represents a tile
                const tileBounds = {
                    minX: j * tileSize,
                    minY: i * tileSize,
                    maxX: (j + 1) * tileSize,
                    maxY: (i + 1) * tileSize,
                    tile: {
                        x: j * tileSize,
                        y: i * tileSize,
                        width: tileSize,
                        height: tileSize
                    }
                };
                tileIndex.insert(tileBounds);
            }
        }
    }
}

// Function to check bullet collision with nearby tiles using rbush
const checkBulletMapCollision = (bullet, gameMap) => {
    const nearbyTiles = tileIndex.search({
        minX: bullet.x - bullet.size / 2,
        minY: bullet.y - bullet.size / 2,
        maxX: bullet.x + bullet.size / 2,
        maxY: bullet.y + bullet.size / 2
    });

    for (const tile of nearbyTiles) {
        const tileRect = tile.tile;
        if (checkBulletTileCollision(bullet, tileRect)) {
            return true; // Collision detected with a nearby tile
        }
    }

    return false; // No collision detected with nearby tiles
};

const checkBulletBulletCollision = (bullet1, bullet2) => {
    const bullet1Circle = new SAT.Circle(new SAT.Vector(bullet1.x, bullet1.y), bullet1.size);
    const bullet2Circle = new SAT.Circle(new SAT.Vector(bullet2.x, bullet2.y), bullet2.size);

    return SAT.testCircleCircle(bullet1Circle, bullet2Circle);
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

// Function to check collision between a bullet and a mine
const checkBulletMineCollision = (bullet, mine) => {
    const bulletCircle = new SAT.Circle(new SAT.Vector(bullet.x, bullet.y), bullet.size / 2);
    const mineCircle = new SAT.Circle(new SAT.Vector(mine.x, mine.y), mine.size / 2);

    const collided = SAT.testCircleCircle(bulletCircle, mineCircle);

    if (collided) {
        return true;
    }

    return false;
};

// Update bullets function using rbush for collision detection
const updateBullets = (gameState, gameMap, tileSize, io) => {
    bulletIndex = new rbush();
    playerIndex = new rbush();

    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        playerIndex.insert({
            minX: player.x,
            minY: player.y,
            maxX: player.x + player.hitboxWidth,
            maxY: player.y + player.hitboxHeight,
            player: player
        });
    }

    for (const mineId in gameState.mines) {
        const mine = gameState.mines[mineId];
        mineIndex.insert({
            minX: mine.x - mine.size / 2,
            minY: mine.y - mine.size / 2,
            maxX: mine.x + mine.size / 2,
            maxY: mine.y + mine.size / 2,
            mine: mine
        });
    }

    for (const bulletId in gameState.bullets) {
        let bullet = gameState.bullets[bulletId];

        //sub-stepping (whatever its called)
        const steps = Math.ceil(bullet.speed / 2);
        const stepSize = bullet.speed / steps;

        for (let step = 0; step < steps; step++) {

            // Remove collided or out-of-bounds bullets
            if (bullet.deleted) {
                let bullet = gameState.bullets[bulletId];
                if (bullet) {
                    delete gameState.bullets[bulletId];
                }
            }

            if (bullet.deleted === true) break;

            bullet.x += bullet.vx * stepSize;
            bullet.y += bullet.vy * stepSize;

            const nearbyPlayers = playerIndex.search({
                minX: bullet.x - bullet.size / 2,
                minY: bullet.y - bullet.size / 2,
                maxX: bullet.x + bullet.size / 2,
                maxY: bullet.y + bullet.size / 2
            });

            for (const nearbyPlayer of nearbyPlayers) {
                let player = nearbyPlayer.player;
                if (!player.dead) {
                    if (checkBulletPlayerCollision(bullet, player, gameState)) {
                        bullet.deleted = true;
                        break;
                    }
                }
            }

            // Check collision with nearby tiles using rbush
            if (checkBulletMapCollision(bullet, gameMap)) {
                if (bullet.bounces <= 0) {
                    bullet.deleted = true;
                    break;
                }
                bullet.bounces -= 1;
            }

            for (const bulletId in gameState.bullets) {
                let bullet = gameState.bullets[bulletId];
                if (!bullet.deleted) {
                    bulletIndex.insert({
                        minX: bullet.x - bullet.size / 2,
                        minY: bullet.y - bullet.size / 2,
                        maxX: bullet.x + bullet.size / 2,
                        maxY: bullet.y + bullet.size / 2,
                        bullet: bullet
                    });
                }
            }

            let nearbyBullets = bulletIndex.search({
                minX: bullet.x - bullet.size / 2,
                minY: bullet.y - bullet.size / 2,
                maxX: bullet.x + bullet.size / 2,
                maxY: bullet.y + bullet.size / 2
            });

            nearbyBullets = nearbyBullets.filter(b => b.id !== bullet.id);

            for (let nearbyBullet of nearbyBullets) {
                let otherBullet = nearbyBullet.bullet;
                if (otherBullet.id !== bullet.id && checkBulletBulletCollision(bullet, otherBullet) && gameState.bullets[otherBullet.id]) {
                    let subtractedDamages = bullet.damage - otherBullet.damage;

                    if (subtractedDamages > 0) {
                        gameState.bullets[otherBullet.id].deleted = true;
                        bullet.damage = subtractedDamages;
                    } else if (subtractedDamages < 0) {
                        bullet.deleted = true;
                    } else if (subtractedDamages === 0) {
                        gameState.bullets[otherBullet.id].deleted = true;
                        bullet.deleted = true;
                    }

                    io.emit('explodeBulletSound');

                    break;
                }
            }

            const nearbyMines = mineIndex.search({
                minX: bullet.x - bullet.size / 2,
                minY: bullet.y - bullet.size / 2,
                maxX: bullet.x + bullet.size / 2,
                maxY: bullet.y + bullet.size / 2
            });

            for (let nearbyMine of nearbyMines) {
                let mine = nearbyMine.mine;
                if (checkBulletMineCollision(bullet, mine)) {
                    mine.timeleft = 0;
                    bullet.deleted = true; // Set collided flag
                    break;
                }
            }

            if (bullet.x < 0 || bullet.x > gameMap[0].length * tileSize ||
                bullet.y < 0 || bullet.y > gameMap.length * tileSize) {
                gameState.bullets[bulletId].deleted = true;
                break;
            }
        }
    }
};



const updateMines = (gameState, io) => {
    for (const mineId in gameState.mines) {
        const mine = gameState.mines[mineId];
        mine.timeleft--; // Decrement timeleft

        if (mine.timeleft == 9) {
            io.emit('explodeMineSound');
        }

        if (mine.timeleft <= 0) {
            mine.explode(gameState, io); // Explode the mine if timeleft is zero or less
        }
    }
};

module.exports = {
    updateMovement,
    updateBullets,
    initMap,
    updateMines
};