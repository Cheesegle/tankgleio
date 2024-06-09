let socket;
let gameState = null;
let tileSize = 50;

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
    if (gameState && gameState.players) {
        for (let playerId in gameState.players) {
            let player = gameState.players[playerId];
            drawPlayer(player);
        }
    }
}

// Draw a player tank
function drawPlayer(player) {
    let tank = new Tank(
        player.x,
        player.y,
        player.angle,
        player.turretAngle,
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
