const SAT = require('sat');
const rbush = require('rbush');

const lerp = (start, end, amount) => {
    return (1 - amount) * start + amount * end;
};

const rLerp = (A, B, w) => {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
};

// Spatial index for tiles
const tileIndex = new rbush();

// Spatial index for players
const playerIndex = new rbush();

// Initialize the spatial index for tiles
const initMap = (gameMap, tileSize) => {
    for (let i = 0; i < gameMap.length; i++) {
        for (let j = 0; j < gameMap[i].length; j++) {
            if (gameMap[i][j] === 1) {
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

// Function to initialize the spatial index for tiles
const initTileIndex = (gameMap, tileSize) => {
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
};

// Function to initialize the spatial index for players
const initPlayerIndex = (gameState) => {
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        const playerBounds = {
            minX: player.x - player.hitboxWidth / 2,
            minY: player.y - player.hitboxHeight / 2,
            maxX: player.x + player.hitboxWidth / 2,
            maxY: player.y + player.hitboxHeight / 2,
            player: player
        };
        playerIndex.insert(playerBounds);
    }
};

// Function to update the spatial index for players
const updatePlayerIndex = (gameState) => {
    // Clear and reinsert player data in the index
    playerIndex.clear();
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        const playerBounds = {
            minX: player.x - player.hitboxWidth / 2,
            minY: player.y - player.hitboxHeight / 2,
            maxX: player.x + player.hitboxWidth / 2,
            maxY: player.y + player.hitboxHeight / 2,
            player: player
        };
        playerIndex.insert(playerBounds);
    }
};

// Function to check collision between a player and nearby tiles using rbush
const checkPlayerTileCollision = (player, gameMap, tileSize) => {
    const nearbyTiles = tileIndex.search({
        minX: player.x - player.hitboxWidth / 2,
        minY: player.y - player.hitboxHeight / 2,
        maxX: player.x + player.hitboxWidth / 2,
        maxY: player.y + player.hitboxHeight / 2
    });

    for (const tile of nearbyTiles) {
        const tileRect = tile.tile;
        if (checkCollision(player, tileRect, tileSize)) {
            return true; // Collision detected with a nearby tile
        }
    }

    return false; // No collision detected with nearby tiles
};

// Function to check collision between a bullet and nearby players using rbush
const checkBulletPlayerCollision = (bullet, gameState) => {
    const nearbyPlayers = playerIndex.search({
        minX: bullet.x - bullet.size / 2,
        minY: bullet.y - bullet.size / 2,
        maxX: bullet.x + bullet.size / 2,
        maxY: bullet.y + bullet.size / 2
    });

    for (const playerBounds of nearbyPlayers) {
        const player = playerBounds.player;
        if (checkBulletPlayerCollisionSingle(bullet, player)) {
            return true; // Collision detected with a nearby player
        }
    }

    return false; // No collision detected with nearby players
};

// Function to check collision between a bullet and a player
const checkBulletPlayerCollisionSingle = (bullet, player) => {
    const bulletCircle = new SAT.Circle(new SAT.Vector(bullet.x, bullet.y), bullet.size / 2);
    const playerRect = new SAT.Box(new SAT.Vector(player.x, player.y), player.hitboxWidth, player.hitboxHeight).toPolygon();

    const response = new SAT.Response();
    const collided = SAT.testCirclePolygon(bulletCircle, playerRect, response);

    if (collided && bullet.owner !== player.id) {
        player.health -= bullet.damage;
        return true;
    }

    return false;
};

// Function to check collision between a bullet and a tile
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

    return collided;
};

// Function to check bullet collision with nearby tiles using rbush
const checkBulletMapCollision = (bullet, gameMap, tileSize) => {
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

// Update bullets function using rbush for collision detection
const updateBullets = (gameState, gameMap, tileSize) => {
    const bulletsToRemove = [];

    for (const bulletId in gameState.bullets) {
        let bullet = gameState.bullets[bulletId];
        // Update bullet position
        bullet.x += bullet.vx * bullet.speed;
        bullet.y += bullet.vy * bullet.speed;

        // Check collision with nearby players
        if (checkBulletPlayerCollision(bullet, gameState)) {
            bulletsToRemove.push(bulletId);
            continue; // Skip further processing if bullet collided with a player
        }

        // Check collision with nearby tiles using rbush
        if (checkBulletMapCollision(bullet, gameMap, tileSize)) {
            if (bullet.bounces <= 0) {
                bulletsToRemove.push(bulletId);
            }
            bullet.bounces -= 1;
            continue; // Skip further processing if bullet collided with a tile
        }

        // Check if bullet is out of bounds
        if (bullet.x < 0 || bullet.x > gameMap[0].length * tileSize ||
            bullet.y < 0 || bullet.y > gameMap.length * tileSize) {
            bulletsToRemove.push(bulletId);
        }
    }

    // Remove collided or out-of-bounds bullets
    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
        delete gameState.bullets[bulletsToRemove[i]];
    }
};

// Function to update player positions and indices
const updatePlayers = (gameState) => {
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        // Update player position
        // You may also want to update the player index here if player position has changed
    }
};

// Initialize spatial indices for tiles and players
const initSpatialIndices = (gameState, gameMap, tileSize) => {
    initTileIndex(gameMap, tileSize);
    initPlayerIndex(gameState);
};

// Update spatial indices for players if player positions have changed
const updateSpatialIndices = (gameState) => {
    updatePlayerIndex(gameState);
};

module.exports = {
    updateMovement,
    updateBullets,
    initMap,
    initSpatialIndices,
    updateSpatialIndices,
    updatePlayers
};