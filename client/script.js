let socket;
let gameState = null;
let prevState = null;
let lastTick = null;
const tileSize = 50;
const tickRate = 1000/20

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
    let lastTickDiff = (performance.now() - lastTick) / tickRate;
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

// Handle window resize
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
