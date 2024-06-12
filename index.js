const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const Player = require('./player');
const Bullet = require('./bullet');
const Mine = require('./mine');
const { updateMovement, updateBullets, initMap, updateMines } = require('./gameLogic');
const { generateMap } = require('./mapGenerator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tickRate = 1000 / 20;

app.use(express.static(path.join(__dirname, 'client')));

const tileSize = 50; // Size of each tile
let gameMap = generateMap(50, 50, 10, 0.5);

const generateHardPoint = () => {
    const hardPoint = {
        x: Math.floor(Math.random() * (gameMap[0].length - 5)), // Random x-coordinate
        y: Math.floor(Math.random() * (gameMap.length - 5)), // Random y-coordinate
        width: 5,
        height: 5
    };

    // Check if the area around the hard point is mostly empty
    for (let i = hardPoint.y; i < hardPoint.y + 5; i++) {
        for (let j = hardPoint.x; j < hardPoint.x + 5; j++) {
            if (gameMap[i][j] !== 0) {
                // Not empty, regenerate hard point
                return generateHardPoint();
            }
        }
    }

    // Mark the area as a hard point
    for (let i = hardPoint.y; i < hardPoint.y + 5; i++) {
        for (let j = hardPoint.x; j < hardPoint.x + 5; j++) {
            gameMap[i][j] = 2; // Assuming 2 represents hard points
        }
    }

    return hardPoint;
};

initMap(gameMap, tileSize);

const gameState = {
    players: {},
    bullets: {},
    mines: {},
    hardPoint: generateHardPoint(),
    redTeamScore: 0,
    blueTeamScore: 0
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
            if (gameMap[i][j] === 0 &&
                j < gameMap[i].length - 1 &&
                i < gameMap.length - 1 &&
                gameMap[i][j + 1] === 0 &&
                gameMap[i + 1][j] === 0 &&
                gameMap[i + 1][j + 1] === 0
            ) {
                emptyLocations.push({ x: j * tileSize, y: i * tileSize });
            }
        }
    }
    return emptyLocations[Math.floor(Math.random() * emptyLocations.length)];
};

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

    socket.on('spawn', (data) => {
        if (!data || !data.username) return;
        socket.emit('mapUpdate', gameMap);
        let spawnLocation;
        spawnLocation = getRandomEmptyLocation(0, gameMap.length);
        if (!gameState.players[socket.id]) {
            let newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, socket.id, truncateString(data.username, 30), data.tankType, team);
            gameState.players[socket.id] = newPlayer;
        } else if (gameState.players[socket.id].dead === true) {
            let player = gameState.players[socket.id];
            gameState.players[socket.id] = new Player(spawnLocation.x, spawnLocation.y, 0, 0, socket.id, truncateString(data.username, 30), data.tankType, team, player.score)
        } else {
            //not supposed to happen!!!
        }
    });

    socket.on('playerMovement', (playerMovement) => {
        if (!playerMovement) return;
        movementQueue[socket.id] = playerMovement;
    });

    socket.on('shoot', () => {
        let player = gameState.players[socket.id];
        if (!player) return;
        let currentTime = performance.now();
        let lastShotTime = lastShotTimes[socket.id] || 0;
        let shootCooldown = player.shootCooldown; // Adjust cooldown time in milliseconds

        if (currentTime - lastShotTime >= shootCooldown) {
            if (player.tankType == 'big') {
                io.emit('bigShot');
                player.stun = 4;
            } else {
                io.emit('shot');
                player.stun = 2;
            }

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

            lastShotTimes[socket.id] = currentTime;
        }
    });

    socket.on('layMine', () => {
        let player = gameState.players[socket.id];
        if (!player) return;
        let currentTime = performance.now();
        let lastMineTime = lastMineTimes[socket.id] || 0;
        let mineCooldown = player.mineCooldown;

        if (currentTime - lastMineTime >= mineCooldown) {
            io.emit('minedownSound');
            let mine = new Mine(player.x + player.width / 2, player.y + player.height / 2, player.id);
            gameState.mines[mine.id] = mine;
            lastMineTimes[socket.id] = currentTime;
            player.stun = 5;
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
        if (!player.dead) {
            // Check if the player is on a hard point
            if (isPlayerOnHardPoint(player)) {

                //add score to player
                player.score += tickRate / 1000;

                // Add score to the player's team
                if (player.team === 'red') {
                    // Increment red team score
                    gameState.redTeamScore += tickRate / 1000;
                } else {
                    // Increment blue team score
                    gameState.blueTeamScore += tickRate / 1000;
                }


            }

            // Other player updates
            if (player.health < player.maxHealth) {
                gameState.players[playerId].health += (player.regenRate / 3);
            }
            if (player.health <= 0) {
                player.dead = true;
                io.to(player.id).emit('dead');
                io.emit('explodeSound');
            }
        }
    }
}

function isPlayerOnHardPoint(player) {
    // Assuming hard points are represented by value 2 in the game map
    const tileX = Math.floor((player.x + player.width / 2) / tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / tileSize);
    return gameMap[tileY][tileX] === 2;
}

setInterval(() => {
    updateMovement(gameState, movementQueue, gameMap, tileSize);
    updateBullets(gameState, gameMap, tileSize, io);
    updateMines(gameState, io);
    updatePlayers();
    io.sockets.emit('state', gameState);
}, tickRate);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});