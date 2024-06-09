//Initialize the server
var app = require('express')();
var express = require('express');
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var Player = require('./player').Player;

function lerp(start, end, amount) {
    return (1 - amount) * start + amount * end;
}

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
        const newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, 'red', 'red');
        gameState.players[socket.id] = newPlayer;
    })

    socket.on('playerMovement', (playerMovement) => {
        //Someone Moved!
        let player = gameState.players[socket.id];

        if (!player) return; // Ensure player exists in gameState

        // Use the object to move the player's coordinates
        let rotationSpeed = 0.1; // Adjust the rotation speed as needed
        if (playerMovement.left) {
            player.x -= 4;
            player.angle = lerp(player.angle, Math.PI, rotationSpeed); // Rotate left
        }
        if (playerMovement.right) {
            player.x += 4;
            player.angle = lerp(player.angle, 0, rotationSpeed); // Rotate right
        }
        if (playerMovement.up) {
            player.y -= 4;
            player.angle = lerp(player.angle, -Math.PI / 2, rotationSpeed); // Rotate up
        }
        if (playerMovement.down) {
            player.y += 4;
            player.angle = lerp(player.angle, Math.PI / 2, rotationSpeed); // Rotate down
        }
        if (playerMovement.mouseAngle) {
            player.turretAngle = playerMovement.mouseAngle;
        }
    })

    socket.on("disconnect", () => {
        //When someone leaves, remove them from the gamestate
        delete gameState.players[socket.id];
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