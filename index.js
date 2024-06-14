const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const Player = require('./player');
const Bullet = require('./bullet');
const Mine = require('./mine');
const { updateMovement, updateBullets, initMap, updateMines } = require('./gameLogic');
const { generateMap } = require('./mapGenerator');
const Lobby = require('./lobby');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tickRate = 20;
const tickTime = 1000 / tickRate;
const tileSize = 50; // Size of each tile

app.use(express.static(path.join(__dirname, 'client')));

// Instantiate the Lobby class
const lobby = new Lobby(io, tickRate);

// Game loop
setInterval(() => {
    lobby.update();
    io.sockets.emit('state', lobby.gameState);
}, tickTime);

// Handle static files and server initialization
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
