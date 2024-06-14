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

const lobbies = {};

function createLobby() {
    const lobbyId = uuidv4();
    const lobby = new Lobby(io, tickRate, lobbyId);
    lobbies[lobbyId] = lobby;
    return lobbyId;
}

function joinLobby(socket, lobbyId) {
    const lobby = lobbies[lobbyId];
    if (lobby) {
        socket.join(lobbyId);
        lobby.handleConnection(socket);
    }
}

io.on('connection', (socket) => {

    socket.on('join-lobby', (lobbyId) => {
        socket.join(lobbyId);
    });

    socket.on('createLobby', () => {
        const lobbyId = createLobby();
        socket.emit('lobbyCreated', lobbyId);
    });

    socket.on('joinLobby', (lobbyId) => {
        joinLobby(socket, lobbyId);
    });

    socket.on('listLobbies', () => {
        const lobbyList = Object.keys(lobbies).map(lobbyId => ({
            id: lobbyId,
            players: lobbies[lobbyId].getPlayerCount(),
            maxPlayers: 999
        }));
        socket.emit('lobbyList', lobbyList);
    });
});

const tickRate = 20;
const tickTime = 1000 / tickRate;

setInterval(() => {
    for (const lobbyId in lobbies) {
        let lobby = lobbies[lobbyId];
        if(lobby.emptytime > tickRate * 20 && lobby.getPlayerCount() === 0){
            delete lobbies[lobbyId];
        }
        lobby.update();
        io.to(lobbyId).emit('state', lobby.gameState);
    }
}, tickTime);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});