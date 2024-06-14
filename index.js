const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { Lobby } = require('./lobby');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'client')));

const tickRate = 20;
const tickTime = 1000 / tickRate;

const lobbies = {};

// Handle lobby creation request
function createLobby() {
    const lobbyId = uuidv4();
    const lobby = new Lobby(io, tickRate, lobbyId);
    lobbies[lobbyId] = lobby;
    return lobbyId;
}

// Handle joining a lobby
function joinLobby(socket, lobbyId) {
    const lobby = lobbies[lobbyId]
    if (lobby) {
        socket.join(lobbyId);
        lobby.handleConnection(socket);
    }
}

io.on('connection', (socket) => {
    socket.on('createLobby', () => {
        const lobbyId = createLobby();
        socket.emit('lobbyCreated', lobbyId);
    });

    socket.on('joinLobby', (lobbyId) => {
        joinLobby(socket, lobbyId);
    });

    // Handle other game events within the lobby
    socket.on('disconnect', () => {
        // Handle disconnection from the lobby
        // Example: remove player from lobby-specific data structures
    });
});


// Game loop for all lobbies
setInterval(() => {
    for (const lobbyId in lobbies) {
        lobbies[lobbyId].update();
        io.to(lobbyId).emit('state', lobbies[lobbyId].gameState);
    }
}, tickTime);

// Handle static files and server initialization
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
