const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const Player = require('./player');
const Bullet = require('./bullet'); // Import the Bullet class
const { updateMovement, updateBullets } = require('./gameLogic');
const { generateMap } = require('./mapGenerator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tickRate = 1000 / 20;

app.use(express.static(path.join(__dirname, 'client')));

const tileSize = 50; // Size of each tile

const gameMap = generateMap(30, 30, 10, 0.3);

const gameState = {
    players: {},
    bullets: []
};

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
// Generate 20 random spawn locations
for (let i = 0; i < 20; i++) {
    spawnLocations.push(getRandomEmptyLocation());
}

let movementQueue = {}; // Object to store movement updates

// Store the last shooting time for each player
const lastShotTimes = {};

io.on('connection', (socket) => {
    socket.on('newPlayer', (data) => {
        socket.emit('map', gameMap);
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        const newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, 'red', 'grey', socket.id, data.username);
        gameState.players[socket.id] = newPlayer;
    });

    socket.on('playerMovement', (playerMovement) => {
        movementQueue[socket.id] = playerMovement;
    });

    socket.on('shoot', () => {
        const player = gameState.players[socket.id];
        if (player) {
            const currentTime = performance.now();
            const lastShotTime = lastShotTimes[socket.id] || 0;
            const shootCooldown = 500; // Adjust cooldown time in milliseconds

            // Check if enough time has passed since the last shot
            if (currentTime - lastShotTime >= shootCooldown) {
                io.emit('shot');
                const bullet = new Bullet(player.x + player.width / 2, player.y + player.height / 2, Math.cos(player.turretAngle), Math.sin(player.turretAngle), player.id);
                gameState.bullets.push(bullet);

                // Update the last shot time for the player
                lastShotTimes[socket.id] = currentTime;
            } else {
                // Handle case where the player is still on cooldown
                socket.emit('blip');
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
            player.respawn(spawnLocations);
            io.emit('explode');
        }
    }
}

setInterval(() => {
    updateMovement(gameState, movementQueue, gameMap, tileSize);
    updateBullets(gameState, gameMap, tileSize);
    updatePlayers();
    io.sockets.emit('state', gameState);
}, tickRate);

const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});