const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const Player = require('./player');
const Bullet = require('./bullet'); // Import the Bullet class
const Mine = require('./mine');
const { updateMovement, updateBullets, initMap, updateMines } = require('./gameLogic');
const { generateMap } = require('./mapGenerator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tickRate = 1000 / 20;

app.use(express.static(path.join(__dirname, 'client')));

const tileSize = 50; // Size of each tile

const gameMap = generateMap(50, 50, 10, 0.5);

initMap(gameMap, tileSize);

const gameState = {
    players: {},
    bullets: {},
    mines: {}
};

function truncateString(str, num) {
    if (str.length > num) {
        return str.slice(0, num) + "...";
    } else {
        return str;
    }
}

const getRandomEmptyLocation = () => {
    const emptyLocations = [];
    for (let i = 0; i < gameMap.length; i++) {
        for (let j = 0; j < gameMap[i].length; j++) {
            if (gameMap[i][j] === 0) {
                // If the tile is empty, add its coordinates to the list of empty locations
                emptyLocations.push({ x: j * tileSize, y: i * tileSize });
            }
        }
    }
    // Choose a random empty location from the list
    return emptyLocations[Math.floor(Math.random() * emptyLocations.length)];
};

var spawnLocations = [];
// Generate 5 random spawn locations
for (let i = 0; i < 5; i++) {
    spawnLocations.push(getRandomEmptyLocation());
}

var movementQueue = {}; // Object to store movement updates

// Store the last shooting time for each player
var lastShotTimes = {};

var lastMineTimes = {};

io.on('connection', (socket) => {
    socket.on('newPlayer', (data) => {
        if (!data.username) return;
        socket.emit('mapUpdate', gameMap);
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        let newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, 'red', 'grey', socket.id, truncateString(data.username, 30), data.tankType);
        gameState.players[socket.id] = newPlayer;
    });

    socket.on('playerMovement', (playerMovement) => {
        movementQueue[socket.id] = playerMovement;
    });

    socket.on('shoot', () => {
        let player = gameState.players[socket.id];
        if (player) {
            let currentTime = performance.now();
            let lastShotTime = lastShotTimes[socket.id] || 0;
            let shootCooldown = player.shootCooldown; // Adjust cooldown time in milliseconds

            // Check if enough time has passed since the last shot
            if (currentTime - lastShotTime >= shootCooldown) {
                io.emit('shot');
                let bullet = new Bullet(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    Math.cos(player.turretAngle),
                    Math.sin(player.turretAngle),
                    player.id,
                    player.bulletSpeed,
                    player.bulletSize,
                    player.bulletDamage,
                    player.bulletBounces
                );
                gameState.bullets[bullet.id] = bullet;

                // Update the last shot time for the player
                lastShotTimes[socket.id] = currentTime;
            } else {
                // Handle case where the player is still on cooldown
                socket.emit('blip');
            }
        }
    });

    socket.on('layMine', () => {
        let player = gameState.players[socket.id];
        if (player) {
            let currentTime = performance.now();
            let lastMineTime = lastMineTimes[socket.id] || 0;
            let mineCooldown = player.mineCooldown; // Adjust cooldown time in milliseconds

            // Check if enough time has passed since the last shot
            if (currentTime - lastMineTime >= mineCooldown) {
                io.emit('minedownSound');
                let mine = new Mine(player.x + player.width / 2, player.y + player.height / 2, player.id);
                gameState.mines[mine.id] = mine;
                // Update the last shot time for the player
                lastMineTimes[socket.id] = currentTime;
            } else {
                // Handle case where the player is still on cooldown
                socket.emit('blipSound');
            }
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        delete movementQueue[socket.id];
    });
});

function updatePlayers() {
    for (const playerId in gameState.players) {
        let player = gameState.players[playerId];
        if (player.health <= 0) {
            delete gameState.players[playerId];
            delete movementQueue[playerId];
            io.to(player.id).emit('dead');
            io.emit('explodeSound');
        }

        if (player.health < player.maxHealth) {
            gameState.players[playerId].health += (player.regenRate / 3);
        }
    }
}

setInterval(() => {
    updateMovement(gameState, movementQueue, gameMap, tileSize);
    updateBullets(gameState, gameMap, tileSize);
    updateMines(gameState, io);
    updatePlayers();
    io.sockets.emit('state', gameState);
}, tickRate);

const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});