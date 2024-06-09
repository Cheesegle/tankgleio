//Initialize the server
var app = require('express')();
var express = require('express');
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var SAT = require('sat');
var { createNoise2D } = require('simplex-noise');

var Player = require('./player').Player;

const tickRate = 1000/20;

var V = SAT.Vector;

function lerp(start, end, amount) {
    return (1 - amount) * start + amount * end;
}

function rLerp(A, B, w) {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
}

// Function to check collision between two rectangles
function checkCollision(player, tile) {
    let playerRect = new SAT.Box(new SAT.Vector(player.x, player.y), player.width, player.height).toPolygon();
    let tileRect = new SAT.Box(new SAT.Vector(tile.x, tile.y), tileSize, tileSize).toPolygon();

    let response = new SAT.Response();
    let collided = SAT.testPolygonPolygon(playerRect, tileRect, response);

    if (collided) {
        // Adjust the player's position to prevent collision
        player.x -= response.overlapV.x;
        player.y -= response.overlapV.y;
    }
}

//Serve the /client folder
var htmlPath = path.join(__dirname, 'client');
app.use(express.static(htmlPath));

const tileSize = 50; // Size of each tile

const noise2D = createNoise2D();

function generateBinarySimplexNoiseArray(width, height, scale, threshold) {
    const array = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const nx = x / scale;
            const ny = y / scale;
            const noiseValue = noise2D(nx, ny);
            const binaryValue = noiseValue < threshold ? 0 : 1;
            row.push(binaryValue);
        }
        array.push(row);
    }
    return array;
}

var gameMap = generateBinarySimplexNoiseArray(50, 50, 10, 0.5)

// Add tiles to the game state
var gameState = {
    players: {},
    tiles: gameMap
};

const spawnLocations = [
    { x: 250, y: 250 },
    { x: 250, y: 500 }
]

var movementQueue = {}; // Object to store movement updates

// Function to update movement based on queued movements
function updateMovement() {
    for (const playerId in movementQueue) {
        const playerMovement = movementQueue[playerId];
        let player = gameState.players[playerId];

        if (!player) continue; // Ensure player exists in gameState

        let rotationSpeed = 0.5; // Adjust the rotation speed as needed
        if (playerMovement.left) {
            player.x -= player.moveSpeed;
            player.angle = rLerp(player.angle, Math.PI, rotationSpeed); // Rotate left
        }
        if (playerMovement.right) {
            player.x += player.moveSpeed;
            player.angle = rLerp(player.angle, 0, rotationSpeed); // Rotate right
        }
        if (playerMovement.up) {
            player.y -= player.moveSpeed;
            player.angle = rLerp(player.angle, -Math.PI / 2, rotationSpeed); // Rotate up
        }
        if (playerMovement.down) {
            player.y += player.moveSpeed;
            player.angle = rLerp(player.angle, Math.PI / 2, rotationSpeed); // Rotate down
        }
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
                    checkCollision(player, tile);
                }
            }
        }
    }
    movementQueue = {}; // Clear the movement queue after processing
}

// New player connection handling
io.on('connection', (socket) => {
    socket.on('newPlayer', () => {
        //Someone joined!
        let spawnLocation = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];
        const newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, 'red', 'red');
        gameState.players[socket.id] = newPlayer;
    })

    socket.on('playerMovement', (playerMovement) => {
        // Queue the movement updates
        movementQueue[socket.id] = playerMovement;
    })

    socket.on("disconnect", () => {
        //When someone leaves, remove them from the gamestate
        delete gameState.players[socket.id];
        delete movementQueue[socket.id]; // Remove the disconnected player's movement from the queue
    })
})

//update loop
setInterval(() => {
    updateMovement();
    io.sockets.emit('state', gameState);
}, tickRate);

//Start the server on port 3000
http.listen(3000, () => {
    console.log('listening on *:3000');
});