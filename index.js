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

const gameMap = generateMap(50, 50, 10, 0.5);

const gameState = {
    players: {},
    bullets: [],
    tiles: gameMap
};

const spawnLocations = [
    { x: 250, y: 250 },
    { x: 250, y: 500 }
];

let movementQueue = {}; // Object to store movement updates


// Store the last shooting time for each player
var lastShotTimes = {};


io.on('connection', (socket) => {
    socket.on('newPlayer', () => {
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        const newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, 'red', 'grey', socket.id);
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
                const bulletSpeed = 10; // Adjust speed as needed
                const bullet = new Bullet(player.x + player.width / 2, player.y + player.height / 2, player.turretAngle, bulletSpeed, player.id);
                gameState.bullets.push(bullet);

                // Update the last shot time for the player
                lastShotTimes[socket.id] = currentTime;
            } else {
                // Handle case where the player is still on cooldown
                socket.emit('shootCooldown');
            }
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        delete movementQueue[socket.id];
    });
});

setInterval(() => {
    updateMovement(gameState, movementQueue, gameMap, tileSize);
    updateBullets(gameState, gameMap, tileSize);
    io.sockets.emit('state', gameState);
}, tickRate);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});