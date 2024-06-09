let socket;
let gameState = null;
let prevState = null;
let lastTick = null;
let lastTickDiff = null;
const tileSize = 50;
const tickRate = 1000 / 20;
let playerCameraX = 0;
let playerCameraY = 0;
let lerpedPlayerX = 0;
let lerpedPlayerY = 0;
const cameraLerpAmount = 0.07;

function rLerp(A, B, w) {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
}

function preload() {
    // Load sound files
    shootSound = loadSound('shoot.wav');
    explodeSound = loadSound('explosion.wav');
    blipSound = loadSound('blip.wav');
}

function setup() {
    // Initialize socket.io
    socket = io();

    // Create canvas
    createCanvas(windowWidth, windowHeight);

    // Join the game
    socket.emit('newPlayer');

    socket.on('shot', (state) => {
        shootSound.play();
    });

    socket.on('explode', (state) => {
        explodeSound.play();
    });

        socket.on('blip', (state) => {
        blipSound.play();
    });

    // Listen to the server and draw the players
    socket.on('state', (state) => {
        // Update local gameState
        lastTick = performance.now();
        prevState = gameState;
        gameState = state;
    });
}

function draw() {
    // Clear the canvas
    clear();

    background('#D8B077');

    lastTickDiff = (performance.now() - lastTick) / tickRate;

    // Update lerped player position
    if (gameState && gameState.players && prevState) {
        if (gameState.players[socket.id] && prevState.players[socket.id]) {
            lerpedPlayerX = lerp(prevState.players[socket.id].x, gameState.players[socket.id].x, lastTickDiff);
            lerpedPlayerY = lerp(prevState.players[socket.id].y, gameState.players[socket.id].y, lastTickDiff);
        }
    }

    // Update camera position
    playerCameraX = lerp(playerCameraX, lerpedPlayerX - width / 2, 0.01);
    playerCameraY = lerp(playerCameraY, lerpedPlayerY - height / 2, 0.01);

    // Translate canvas to follow player
    translate(-playerCameraX, -playerCameraY);

    // Render tiles
    if (gameState && gameState.tiles) {
        for (let i = 0; i < gameState.tiles.length; i++) {
            for (let j = 0; j < gameState.tiles[i].length; j++) {
                if (gameState.tiles[i][j] === 1) {
                    push();
                    fill(100); // Example tile color
                    strokeWeight(2);
                    rect(j * tileSize, i * tileSize, tileSize, tileSize);
                    pop();
                }
            }
        }
    }

    // Draw the players that the server sent
    if (gameState && gameState.players && prevState) {
        for (let playerId in gameState.players) {
            let player = gameState.players[playerId];
            drawPlayer(player, playerId);
        }
    }

    // Draw bullets
    if (gameState && gameState.bullets) {
        for (let i = 0; i < gameState.bullets.length; i++) {
            let bullet = gameState.bullets[i];
            drawBullet(bullet);
        }
    }
}

// Draw a bullet with linear interpolation
function drawBullet(bullet) {
    if (prevState && prevState.bullets) {
        for (let i = 0; i < prevState.bullets.length; i++) {
            if (prevState.bullets[i].id === bullet.id) {
                const prevBullet = prevState.bullets[i];
                const lerpedX = lerp(prevBullet.x, bullet.x, lastTickDiff);
                const lerpedY = lerp(prevBullet.y, bullet.y, lastTickDiff);
                push();
                fill('white'); // Example bullet color
                ellipse(lerpedX, lerpedY, bullet.width, bullet.height);
                pop();
                return; // Exit the loop once the bullet is found
            }
        }
    }
    // If no previous state or matching bullet found, draw bullet without interpolation
    push();
    fill('yellow');
    ellipse(bullet.x, bullet.y, bullet.width, bullet.height);
    pop();
}

function mouseClicked() {
    socket.emit('shoot')
}

// Draw a player tank
function drawPlayer(player, playerId) {
    if (prevState && prevState.players && prevState.players[playerId]) {
        let tank = new Tank(
            lerp(prevState.players[playerId].x, player.x, lastTickDiff),
            lerp(prevState.players[playerId].y, player.y, lastTickDiff),
            rLerp(prevState.players[playerId].angle, player.angle, lastTickDiff),
            rLerp(prevState.players[playerId].turretAngle, player.turretAngle, lastTickDiff),
            player.color,
            player.turretColor,
            player.width,
            player.height
        );
        tank.render();
    }
}

// Handle window resize
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}