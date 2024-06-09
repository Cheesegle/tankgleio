let socket;
let gameState = null;

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

    // Draw the players that the server sent
    if (gameState) {
        for (let playerId in gameState.players) {
            let player = gameState.players[playerId];
            drawPlayer(player);
        }
    }
}

// p5.js mouseMoved function
function mouseMoved() {
    // Calculate the angle between tank position and mouse position
    const mouseX = mouseX;
    const mouseY = mouseY;
    const tankX = gameState.players[socket.id].x; // Assuming the tank's x position is stored in gameState
    const tankY = gameState.players[socket.id].y; // Assuming the tank's y position is stored in gameState
    const angle = Math.atan2(mouseY - tankY, mouseX - tankX);
    // Emit the turret angle to the server
    socket.emit('turretAngle', angle);
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