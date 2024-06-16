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

function createLobby(socketId) {
    let lobbyId = uuidv4();
    let lobby = new Lobby(io, tickRate, socketId);
    lobbies[lobbyId] = lobby;
    return lobbyId;
}

function checkOwner(socketId) {
    for (let lobbyId in lobbies) {
        if (lobbies[lobbyId].owner === socketId) {
            return true;
        }
    }
    return false;
}

function joinLobby(socket, lobbyId) {
    for (let lobbyId2 in lobbies) {
         let lobby = lobbies[lobbyId2];
         lobby.handleDisconnection(socket.id);
         socket.leave(lobbyId2);
    }
    let lobby = lobbies[lobbyId];
    if (lobby) {
        socket.join(lobbyId);
        lobby.handleConnection(socket);
    } else {
        socket.emit('error', 'Lobby does not exist');
    }
}

io.on('connection', (socket) => {
    socket.on('createLobby', () => {
        if(!checkOwner(socket.id)){
            let lobbyId = createLobby(socket.id);
            socket.emit('lobbyCreated', lobbyId);
        }else{
            socket.emit('alert', "You are already the owner of a lobby.");
        }

    });

    socket.on('joinLobby', (lobbyId) => {
        joinLobby(socket, lobbyId);
    });

    socket.on('listLobbies', () => {
        let lobbyList = Object.keys(lobbies).map(lobbyId => ({
            id: lobbyId,
            players: lobbies[lobbyId].getPlayerCount(),
            maxPlayers: lobbies[lobbyId].maxPlayers
        }));
        socket.emit('lobbyList', lobbyList);
    });
});

const tickRate = 20;
const tickTime = 1000 / tickRate;

setInterval(() => {
    for (const lobbyId in lobbies) {
        const lobby = lobbies[lobbyId];
        if (lobby.emptytime > tickRate * 5 && lobby.getPlayerCount() === 0) {
            delete lobbies[lobbyId];
            let lobbyList = Object.keys(lobbies).map(lobbyId => ({
                id: lobbyId,
                players: lobbies[lobbyId].getPlayerCount(),
                maxPlayers: lobbies[lobbyId].maxPlayers
            }));
            io.emit('lobbyList', lobbyList);
        } else {
            lobby.update();
            io.to(lobbyId).emit('state', lobby.gameState);
        }
    }
}, tickTime);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});