//Initialize the server
var app = require('express')();
var express = require('express');
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var Player = require('./player').Player;

//Serve the /client folder
var htmlPath = path.join(__dirname, 'client');
app.use(express.static(htmlPath));

//Variable that stores the players
const gameState = {
    players: {}
}

const spawnLocations = [
    { x: 250, y: 250 },
    { x: 250, y: 500 }
]

//Function that is called whenever someone joins
io.on('connection', (socket) => {
    socket.on('newPlayer', () => {
        //Someone joined!
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        gameState.players[socket.id] = new Player(spawnLocation.x, spawnLocation.y, )
    })

    socket.on('playerMovement', (playerMovement) => {
        //Someone Moved!
        const player = gameState.players[socket.id]

        //Use the object to move the players coordinates
        if (playerMovement.left) {
            player.x -= 4
        }
        if (playerMovement.right) {
            player.x += 4
        }

        if (playerMovement.up) {
            player.y -= 4
        }
        if (playerMovement.down) {
            player.y += 4
        }
    })


    socket.on("disconnect", () => {
        //When someone leaves, remove them from the gamestate
        delete gameState.players[socket.id]
    })
})

//Emit the gamestate to the clients 60 times / second
setInterval(() => {
    io.sockets.emit('state', gameState);
}, 1000 / 60);

//Start the server on port 3000
http.listen(3000, () => {
    console.log('listening on *:3000');
});