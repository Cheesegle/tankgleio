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
let gameStarted = false;
let username = '';
let customFont;
let scaledWidth;
let scaledHeight;
let scalingFactor = 1500;
const maxScalingFactor = 3000;
const minScalingFactor = 1000;
let targetScalingFactor = scalingFactor;

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
    // Load custom font
    customFont = loadFont('Poppins-Bold.ttf'); // Update this path to your font file
}

function setup() {
    // Create canvas
    createCanvas(windowWidth, windowHeight);

    // Initialize socket.io
    socket = io();

    // Show the start menu
    document.getElementById('startMenu').style.display = 'block';

    // Event listener for start button
    document.getElementById('startButton').addEventListener('click', startGame);

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
        if (gameStarted) {
            // Update local gameState
            lastTick = performance.now();
            prevState = gameState;
            gameState = state;
        }
    });
}

function startGame() {
    // Get the username from the input field
    username = document.getElementById('usernameInput').value;

    if (!username) {
        alert('Please enter a username.');
        return;
    }

    // Hide the start menu
    document.getElementById('startMenu').style.display = 'none';

    // Join the game with the username
    socket.emit('newPlayer', { username: username });
    gameStarted = true;
}

function draw() {
    if (!gameStarted) {
        return; // Skip drawing if the game hasn't started
    }

    // Clear the canvas
    clear();

    updateZoom();

    // Apply scaling
    scale(windowWidth / scalingFactor);

    // Calculate scaled canvas dimensions
    scaledWidth = windowWidth / (windowWidth / scalingFactor);
    scaledHeight = windowHeight / (windowWidth / scalingFactor);

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
    playerCameraX = lerp(playerCameraX, lerpedPlayerX - scaledWidth / 2, cameraLerpAmount);
    playerCameraY = lerp(playerCameraY, lerpedPlayerY - scaledHeight / 2, cameraLerpAmount);

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
                if (bullet.owner === socket.id) {
                    fill('green');
                } else {
                    fill('red');
                }
                ellipse(lerpedX, lerpedY, bullet.size, bullet.size);
                pop();
                return; // Exit the loop once the bullet is found
            }
        }
    }
    // If no previous state or matching bullet found, draw bullet without interpolation
    push();
    if (bullet.owner === socket.id) {
        fill('green');
    } else {
        fill('red');
    }
    ellipse(bullet.x, bullet.y, bullet.size, bullet.size);
    pop();
}

function mouseClicked() {
    if (gameStarted) {
        socket.emit('shoot');
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
            player.width,
            player.height
        );
        tank.render();

        // Draw the username
        push();
        fill(255);
        textAlign(CENTER);
        textSize(16);
        textFont(customFont); // Use the custom font
        textAlign(CENTER);
        text(player.username, tank.x + tank.width / 2, tank.y - 25); // Display the username above the tank
        pop();
    }
}

function updateZoom() {
    // Interpolate towards the target scaling factor
    scalingFactor = lerp(scalingFactor, targetScalingFactor, 0.1); // Adjust the interpolation factor (0.1) for the desired smoothness

    // Clamp the scaling factor within the specified range
    scalingFactor = constrain(scalingFactor, minScalingFactor, maxScalingFactor);
}

function mouseWheel(event) {
    if (event.delta > 0) {
        targetScalingFactor = Math.min(targetScalingFactor + 100, maxScalingFactor); // Increase target scaling factor but clamp to maxScalingFactor
    } else {
        targetScalingFactor = Math.max(targetScalingFactor - 100, minScalingFactor); // Decrease target scaling factor but clamp to minScalingFactor
    }
}

// Handle window resize
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}