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