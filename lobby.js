const { updateMovement, updateBullets, initMap, updateMines } = require('./gameLogic');
const { generateMap } = require('./mapGenerator');
const Player = require('./player');
const Bullet = require('./bullet');
const Mine = require('./mine');


function truncateString(str, num) {
    if (str.length > num) {
        return str.slice(0, num) + "...";
    } else {
        return str;
    }
}

class Lobby {
    constructor(io, tickRate) {
        this.io = io;
        this.gameMap = generateMap(50, 50, 10, 0.5);
        this.gameState = {
            players: {},
            bullets: {},
            mines: {},
            hardPoint: this.generateHardPoint(),
            redTeamScore: 0,
            blueTeamScore: 0,
            roundTimeLeft: tickRate * 60 * 4, // 4 minutes initially
            nextRotation: tickRate * 60 // 1 minute for hard point rotation initially
        };
        this.tileSize = 50;
        this.tickRate = tickRate;
        this.players = {};
        this.movementQueue = {};
        this.lastShotTimes = {};
        this.lastMineTimes = {};

        this.setupSocket();
    }

    setupSocket() {
        this.io.on('connection', (socket) => {
            socket.on('join-lobby', (lobbyId) => {
                socket.join(lobbyId);
                // Handle lobby-specific socket events
                // Example:
                socket.on('spawn', (data) => this.handleSpawn(socket, data, team, lobbyId));
                socket.on('disconnect', () => this.handleDisconnection(socket.id, lobbyId));
            });
        });
    }

    handleConnection(socket) {
        // Assign a team to the new player
        let team = Math.random() < 0.5 ? 'red' : 'blue';
        socket.emit('team', team);

        // Handle player spawn and movement
        socket.on('spawn', (data) => this.handleSpawn(socket, data, team));
        socket.on('playerMovement', (playerMovement) => this.handlePlayerMovement(socket.id, playerMovement));
        socket.on('shoot', () => this.handleShoot(socket.id));
        socket.on('layMine', () => this.handleLayMine(socket.id));
        socket.on('switchTeam', () => this.handleSwitchTeam(socket));
        socket.on('esc', () => this.handleEsc(socket.id));
        socket.on('ping', () => socket.emit('pong'));
    }

    handleDisconnection(socketId) {
        delete this.players[socketId];
        delete this.movementQueue[socketId];
    }

    handleSpawn(socket, data, team) {
        if (!data || !data.username) return;
        socket.emit('mapUpdate', this.gameMap);
        let spawnLocation = this.getRandomEmptyLocation(0, this.gameMap.length);

        if (Object.keys(this.gameState.players).length == 0) {
            this.newRound(false);
        }

        if (!this.gameState.players[socket.id]) {
            let newPlayer = new Player(spawnLocation.x, spawnLocation.y, 0, 0, socket.id, truncateString(data.username, 30), data.tankType, team);
            this.gameState.players[socket.id] = newPlayer;
            this.players[socket.id] = socket;
        } else if (this.gameState.players[socket.id].dead === true && this.gameState.players[socket.id].spawnCooldown === 0) {
            let player = this.gameState.players[socket.id];
            this.gameState.players[socket.id] = new Player(spawnLocation.x, spawnLocation.y, 0, 0, socket.id, truncateString(data.username, 30), data.tankType, team, player.score);
            this.players[socket.id] = socket;
        } else {
            //not supposed to happen!!!
        }
    }

    handlePlayerMovement(socketId, playerMovement) {
        if (!this.gameState.players[socketId]) return;
        if (!playerMovement || this.gameState.players[socketId].dead) return;
        this.movementQueue[socketId] = playerMovement;
    }

    handleShoot(socketId) {
        if (!this.gameState.players[socketId]) return;
        let player = this.gameState.players[socketId];
        if (!player || player.dead) return;
        let currentTime = performance.now();
        let lastShotTime = this.lastShotTimes[socketId] || 0;
        let shootCooldown = player.shootCooldown; // Adjust cooldown time in milliseconds

        if (currentTime - lastShotTime >= shootCooldown) {
            if (player.tankType == 'big') {
                this.io.emit('bigShot');
                player.stun = player.shotStunTime;
            } else {
                this.io.emit('shot');
                player.stun = player.shotStunTime;
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
            this.gameState.bullets[bullet.id] = bullet;

            this.lastShotTimes[socketId] = currentTime;
        }
    }

    handleLayMine(socketId) {
        if (!this.gameState.players[socketId]) return;
        let player = this.gameState.players[socketId];
        if (!player || player.dead) return;
        let currentTime = performance.now();
        let lastMineTime = this.lastMineTimes[socketId] || 0;
        let mineCooldown = player.mineCooldown;

        if (currentTime - lastMineTime >= mineCooldown) {
            this.io.emit('minedownSound');
            let mine = new Mine(player.x + player.width / 2, player.y + player.height / 2, player.id);
            this.gameState.mines[mine.id] = mine;
            this.lastMineTimes[socketId] = currentTime;
            player.stun = 5;
        }
    }

    handleSwitchTeam(socket) {
        let team = socket.team === 'blue' ? 'red' : 'blue';
        socket.emit('team', team);
    }

    handleEsc(socketId) {
        if (!this.gameState.players[socketId]) return;
        if (this.gameState.players[socketId].spawnCooldown > 0) return;
        this.gameState.players[socketId].dead = true;
        this.io.to(socketId).emit('dead');
        this.io.emit('explodeSound');
        this.gameState.players[socketId].spawnCooldown = 5 * this.tickRate;
    }

    getRandomEmptyLocation(yMin, yMax) {
        let emptyLocations = [];
        for (let i = yMin; i < yMax; i++) {
            for (let j = 0; j < this.gameMap[i].length; j++) {
                if (
                    this.gameMap[i][j] === 0 &&
                    j < this.gameMap[i].length - 1 &&
                    i < this.gameMap.length - 1 &&
                    this.gameMap[i][j + 1] === 0 &&
                    this.gameMap[i + 1][j] === 0 &&
                    this.gameMap[i + 1][j + 1] === 0
                ) {
                    emptyLocations.push({ x: j * this.tileSize, y: i * this.tileSize });
                }
            }
        }
        return emptyLocations[Math.floor(Math.random() * emptyLocations.length)];
    }

    generateHardPoint() {
        const possiblePositions = [];
        for (let i = 0; i < this.gameMap.length - 5; i++) {
            for (let j = 0; j < this.gameMap[0].length - 5; j++) {
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
                    if (this.gameMap[i][j] !== 0) {
                        isValid = false;
                        break;
                    }
                }
                if (!isValid) break;
            }

            if (isValid) {
                for (let i = y; i < y + 5; i++) {
                    for (let j = x; j < x + 5; j++) {
                        this.gameMap[i][j] = 2;
                    }
                }
                return { x, y, width: 5, height: 5 };
            }
        }

        return null;
    }

    update() {

        updateMines(this.gameState, this.io)

        updateBullets(this.gameState, this.gameMap, this.tileSize, this.io)

        updateMovement(this.gameState, this.movementQueue, this.gameMap, this.tileSize);


        for (const playerId in this.gameState.players) {
            let player = this.gameState.players[playerId];
            if (player.spawnCooldown > 0) {
                player.spawnCooldown--;
            }
            if (!player.dead) {
                if (this.isPlayerOnHardPoint(player)) {
                    player.score += this.tickRate / 50;

                    if (player.team === 'red') {
                        this.gameState.redTeamScore += this.tickRate / 50;
                    } else {
                        this.gameState.blueTeamScore += this.tickRate / 50;
                    }
                }

                if (player.health < player.maxHealth) {
                    this.gameState.players[playerId].health += (player.regenRate / 6);
                }
                if (player.health <= 0) {
                    player.dead = true;
                    this.io.to(player.id).emit('dead');
                    this.io.emit('explodeSound');
                }
            }
        }
    }

    newRound(KILL = true) {
        this.gameMap = generateMap(50, 50, 10, 0.5);
        initMap(this.gameMap, this.tileSize);

        this.gameState = {
            players: {},
            bullets: {},
            mines: {},
            hardPoint: this.generateHardPoint(),
            redTeamScore: 0,
            blueTeamScore: 0,
            roundTimeLeft: this.tickRate * 60,
            nextRotation: this.tickRate * 60
        };

        if (KILL) this.io.emit('dead');

        this.io.emit('mapUpdate', this.gameMap);
    }

    isPlayerOnHardPoint(player) {
        const tileX = Math.floor((player.x + player.width / 2) / this.tileSize);
        const tileY = Math.floor((player.y + player.height / 2) / this.tileSize);
        if (this.gameMap[tileY][tileX]) {
            return this.gameMap[tileY][tileX] === 2;
        } else {
            return false;
        }
    }
}

module.exports = { Lobby };