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

var roundTime = 20 * 60 * 4;


app.use(express.static(path.join(__dirname, 'client')));

const tileSize = 50; // Size of each tile
let gameMap = generateMap(50, 50, 10, 0.5);

const removeHardPoint = () => {
    let hp = gameState.hardPoint; 

    for(let i = hp.y; i < hp.y + hp.width; i++){
        for(let j = hp.x; j < hp.x + hp.height; j++){
            gameMap[i][j]=0;
        }
    }
}
const generateHardPoint = () => {
    const possiblePositions = [];
    for (let i = 0; i < gameMap.length - 5; i++) {
        for (let j = 0; j < gameMap[0].length - 5; j++) {
            possiblePositions.push({ x: j, y: i });
        }
    }

    for (let i = possiblePositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possiblePositions[i], possiblePositions[j]] = [possiblePositions[j], possiblePositions[i]];
    }

    for (const position of possiblePositions) {
        const { x, y } = position;
        let isValid = true;

        for (let i = y; i < y + 5; i++) {
            for (let j = x; j < x + 5; j++) {
                if (gameMap[i][j] !== 0) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) break;
        }

        if (isValid) {
            for (let i = y; i < y + 5; i++) {
                for (let j = x; j < x + 5; j++) {
                    gameMap[i][j] = 2;
                }
            }
            return { x, y, width: 5, height: 5 };
        }
    }

    return null;
};

initMap(gameMap, tileSize);

let gameState = {
    players: {},
    bullets: {},
    mines: {},
    hardPoint: generateHardPoint(),
    redTeamScore: 0,
    blueTeamScore: 0,
    roundTimeLeft: roundTime,
    nextRotation: 20*60
};

function truncateString(str, num) {
    if (str.length > num) {
        return str.slice(0, num) + "...";
    } else {
        return str;
    }
}

const getRandomEmptyLocation = (yMin, yMax) => {
    let emptyLocations = [];
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
        
        if(Object.keys(gameState.players).length==0){
            newRound(false);
        }

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
        if (!gameState.players[socket.id]) return;
        if (!playerMovement || gameState.players[socket.id].dead) return;
        movementQueue[socket.id] = playerMovement;
    });

    socket.on('shoot', () => {
        let player = gameState.players[socket.id];
        if (!player) return;
        if (player.dead) return;
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
        if (!player || player.dead) return;
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

    socket.on('ping', () => {
        socket.emit('pong');
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
                gameState.players[playerId].health += (player.regenRate / 6);
            }
            if (player.health <= 0) {
                player.dead = true;
                io.to(player.id).emit('dead');
                io.emit('explodeSound');
            }
        }
    }
}

function newRound(killEveryone=true) {
    // Regenerate the map
    gameMap = generateMap(50, 50, 10, 0.5);
    initMap(gameMap, tileSize);

    gameState = {
        players: {},
        bullets: {},
        mines: {},
        hardPoint: generateHardPoint(),
        redTeamScore: 0,
        blueTeamScore: 0,
        roundTimeLeft: roundTime,
        nextRotation: 20*60
    };

    if(killEveryone) io.emit('dead');

    io.emit('mapUpdate', gameMap);
};

function isPlayerOnHardPoint(player) {
    // Assuming hard points are represented by value 2 in the game map
    const tileX = Math.floor((player.x + player.width / 2) / tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / tileSize);
    if (gameMap[tileY][tileX]) {
        return gameMap[tileY][tileX] === 2;
    } else {
        return false;
    }
}

setInterval(() => {
    if(Object.keys(gameState.players).length != 0){
        gameState.roundTimeLeft--;
        gameState.nextRotation--;
        if (gameState.roundTimeLeft <= 0) {
            newRound();
        }
    
        if(gameState.nextRotation <= 0){
            removeHardPoint();
            gameState.hardPoint = generateHardPoint();
            gameState.nextRotation = 20 * 60;
        }
    
        updateMovement(gameState, movementQueue, gameMap, tileSize);
        updateBullets(gameState, gameMap, tileSize, io);
        updateMines(gameState, io);
        updatePlayers();
        io.sockets.emit('state', gameState);
    }
}, tickRate);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});