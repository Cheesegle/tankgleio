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

const getRandomEmptyLocation = (yMin, yMax) => {
    const emptyLocations = [];
    for (let i = yMin; i < yMax; i++) {
        for (let j = 0; j < gameMap[i].length; j++) {
            if (gameMap[i][j] === 0) {
                emptyLocations.push({ x: j * tileSize, y: i * tileSize });
            }
        }
    }
    return emptyLocations[Math.floor(Math.random() * emptyLocations.length)];
};

const redSpawnLocations = [];
const blueSpawnLocations = [];

for (let i = 0; i < 5; i++) {
    redSpawnLocations.push(getRandomEmptyLocation(0, 10));
}

for (let i = 0; i < 5; i++) {
    blueSpawnLocations.push(getRandomEmptyLocation(gameMap.length - 10, gameMap.length));
}

var movementQueue = {};

var lastShotTimes = {};

var lastMineTimes = {};

io.on('connection', (socket) => {
    let team;
    if (Math.random() < 0.5) {
        team = 'red';
    } else {
        team = 'blue';
    }

    socket.emit('team', team);

    socket.on('newPlayer', (data) => {
        if (!data.username) return;
        socket.emit('mapUpdate', gameMap);
        let spawnLocation;
        if (team === 'red') {
            spawnLocation = redSpawnLocations[Math.floor(Math.random() * redSpawnLocations.length)];
        } else {
            spawnLocation = blueSpawnLocations[Math.floor(Math.random() * blueSpawnLocations.length)];
        }
        let newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, socket.id, truncateString(data.username, 30), data.tankType, team);
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
                    player.bulletBounces,
                    player.team
                );
                gameState.bullets[bullet.id] = bullet;

                // Update the last shot time for the player
                lastShotTimes[socket.id] = currentTime;
            } else {
                // Handle case where the player is still on cooldown
                socket.emit('blipSound');
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

    socket.on('switchTeam', () => {
        if (team === 'blue') {
            team = 'red';
        } else {
            team = 'blue';
        }
        socket.emit('team', team);
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        delete movementQueue[socket.id];
    });
});

function updatePlayers() {
    for (const playerId in gameState.players) {
        let player = gameState.players[playerId];

        if (player.health < player.maxHealth) {
            gameState.players[playerId].health += (player.regenRate / 3);
        }
        if (player.health <= 0) {
            delete gameState.players[playerId];
            delete movementQueue[playerId];
            io.to(player.id).emit('dead');
            io.emit('explodeSound');
        }
    }
}

setInterval(() => {
    updateMovement(gameState, movementQueue, gameMap, tileSize);
    let blownup = updateBullets(gameState, gameMap, tileSize);
    if(blownup){
        io.emit("explodeBullet", blownup);
    }
    updateMines(gameState, io);
    updatePlayers();
    io.sockets.emit('state', gameState);
}, tickRate);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});