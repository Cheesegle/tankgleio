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
const cameraLerpAmount = 0.05;

function rLerp(A, B, w) {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
}

function setup() {
    // Initialize socket.io
    socket = io();

    // Create canvas
    createCanvas(windowWidth, windowHeight);

    // Join the game
    socket.emit('newPlayer');

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
                    fill(100); // Example tile color
                    rect(j * tileSize, i * tileSize, tileSize, tileSize);
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
            player.sideColor
        );
        tank.render();
    }
}

// Handle window resize
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}