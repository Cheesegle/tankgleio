let socket = io();
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
let playerWidth = 0;
let playerHeight = 0;
const cameraLerpAmount = 0.07;
let gameStarted = false;
let username = '';
const SHADOW = "rgba(0, 0, 0, 0.3)";
let customFont;
let scaledWidth;
let scaledHeight;
let scalingFactor = 1500;
const maxScalingFactor = 3000;
const minScalingFactor = 1000;
let targetScalingFactor = scalingFactor;
let tiles = [];

let playerTracks = {};
var trackCount = 0;

function rLerp(A, B, w) {
    let CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
    let SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
    return Math.atan2(SN, CS);
}

function preload() {
    // Load sound files
    bigShootSound = loadSound('bigShellShot.mp3', soundLoaded);
    shootSound = loadSound('shellShot.mp3', soundLoaded);
    explodeSound = loadSound('explosion.wav', soundLoaded);
    bulletBulletSound = loadSound('bulletExplosion.wav', soundLoaded);
    minedownSound = loadSound('mineDown.mp3', soundLoaded);
    explodeMineSound = loadSound('mineExplode.mp3', soundLoaded);
    // Load custom font
    customFont = loadFont('Poppins-Bold.ttf'); // Update this path to your font file
}

function soundLoaded() {
    new p5.Reverb().process(explodeMineSound, 1, 1);
    explodeMineSound.setVolume(0.1);
    bigShootSound.setVolume(0.15);
    shootSound.setVolume(0.15);
    explodeSound.setVolume(0.15);
    bulletBulletSound.setVolume(0.65);
    minedownSound.setVolume(0.1);
    //...
}

function switchTeam() {
    socket.emit('switchTeam');
}


socket.on('team', (team) => {
    const switchTeamButton = document.getElementById('switchTeamButton');
    if (team === 'red') {
        switchTeamButton.style.setProperty('background-color', 'red', 'important');
    } else if (team === 'blue') {
        switchTeamButton.style.setProperty('background-color', 'blue', 'important');
    } else {
        switchTeamButton.style.setProperty('background-color', 'gray', 'important');
    }
});


function setup() {
    // Create canvas
    createCanvas(windowWidth, windowHeight);

    // Show the start menu
    document.getElementById('startMenu').style.display = 'block';

    // Event listener for start button
    document.getElementById('startButton').addEventListener('click', startGame);

    socket.on('shot', () => {
        shootSound.play();
    });

    socket.on('bigShot', () => {
        bigShootSound.play();
    });

    socket.on('explodeSound', () => {
        explodeSound.play();
    });

    socket.on('minedownSound', () => {
        minedownSound.play();
    });

    socket.on('explodeMineSound', () => {
        explodeMineSound.play();
    });

    socket.on('explodeBulletSound', () => {
        bulletBulletSound.play();
    });

    socket.on('mapUpdate', (serverTiles) => {
        tiles = serverTiles;
    });

    socket.on('dead', (state) => {
        document.getElementById('startMenu').style.display = 'block';;
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

    const tankType = document.getElementById('tankTypeSelector').value;

    // Hide the start menu
    document.getElementById('startMenu').style.display = 'none';

    // Join the game with the username
    socket.emit('spawn', {
        username: username,
        tankType: tankType
    });
    setTimeout(() => {
        gameStarted = true;
    }, 10);

}

// Add a function to draw mines
function drawMines() {
    if (gameState && gameState.mines) {
        for (let mineId in gameState.mines) {
            let mine = gameState.mines[mineId];
            drawMine(mine);
        }
    }
}

// Draw a mine
function drawMine(mine) {
    push();
    noStroke();

    fill(SHADOW);
    ellipse(mine.x + 4, mine.y + 4, mine.size);

    fill('#FFD700');
    ellipse(mine.x, mine.y, mine.size, mine.size);
    pop();
}

// Add a function to draw mine explosions
function drawMineExplosions() {
    if (gameState && prevState && gameState.mines) {
        for (let mineId in prevState.mines) {
            let mine = gameState.mines[mineId];
            if (!gameState.mines[mineId]) {
                // Mine explosion effect
                drawExplosionEffect(prevState.mines[mineId].x, prevState.mines[mineId].y, prevState.mines[mineId].explodeRadius);
            }
        }
    }
}

// Draw explosion effect
function drawExplosionEffect(x, y, radius) {
    push();
    strokeWeight(20);
    stroke(255, 100, 0); // Red color
    fill(255, 50, 0);
    ellipse(x, y, radius * 2);
    pop();
}

function draw() {
    if (!gameStarted) return;
    if (!gameState) return;

    // Clear the canvas
    clear();

    textFont(customFont);

    push();
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
            playerWidth = gameState.players[socket.id].width;
            playerHeight = gameState.players[socket.id].height;
        }
    }

    // Update camera position with lerping
    playerCameraX = lerp(playerCameraX, lerpedPlayerX - scaledWidth / 2, cameraLerpAmount);
    playerCameraY = lerp(playerCameraY, lerpedPlayerY - scaledHeight / 2, cameraLerpAmount);

    // Translate canvas to follow player with interpolated camera position
    translate(-playerCameraX, -playerCameraY);

    //render tile shadow
    if (gameState && tiles) {
        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                if (tiles[i][j] === 1) {
                    push();
                    fill(SHADOW); // Example tile color
                    noStroke();
                    rect(j * tileSize + 8, i * tileSize + 8, tileSize, tileSize);
                    pop();
                }
            }
        }
    }

    drawHardpoints();

    // Update and render tracks
    for (let playerId in playerTracks) {
        let tracks = playerTracks[playerId];
        for (let i = tracks.length - 1; i >= 0; i--) {
            const track = tracks[i];

            if (track.delete) {
                tracks.splice(i, 1);
                continue;
            }

            track.update();
            track.render();
        }
    }

    drawMines();

    // Draw bullets
    if (gameState && gameState.bullets) {
        for (let bulletId in gameState.bullets) {
            let bullet = gameState.bullets[bulletId];
            drawBullet(bullet);
        }
    }

    // Draw players
    if (gameState && gameState.players && prevState) {
        for (let playerId in gameState.players) {
            let player = gameState.players[playerId];
            if (!player.dead) {
                drawPlayer(player, playerId);

                // Store player tracks
                if (!playerTracks[playerId]) {
                    playerTracks[playerId] = [];
                }
                
                if (prevState && prevState.players[playerId]) {
                    let prevPlayer = prevState.players[playerId];
                    if (prevPlayer.x !== player.x || prevPlayer.y !== player.y) {
                        playerTracks[playerId].push(new Track(player.x, player.y, player.width, player.height, player.angle));
                    }
                }
            }
        }
    }

    // Render tiles
    if (gameState && tiles) {
        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                if (tiles[i][j] === 1) {
                    push();
                    fill("#c9b7b1");
                    strokeWeight(2);
                    rect(j * tileSize, i * tileSize, tileSize, tileSize);
                    pop();
                }
            }
        }
    }

    drawMineExplosions();
    pop();
    // Draw scoreboard
    drawHUD();
}

function drawHUD() {
    drawScoresAndTeamStats();
}

function drawScoresAndTeamStats() {
    const padding = 20;
    const sectionWidth = 220;
    const sectionHeight = 40;
    const spacing = 10;

    let y = padding;
    const x = width - sectionWidth - padding;

    drawTeamScore('Red Team', 'rgba(231, 76, 60, 0.8)', gameState.redTeamScore, x, y, sectionWidth, sectionHeight);
    y += sectionHeight + spacing;

    y = drawTeamSection('Red Team', 'rgba(231, 76, 60, 0.8)', gameState.players, 'red', x, y, sectionWidth);
    y += padding;

    drawTeamScore('Blue Team', 'rgba(52, 152, 219, 0.8)', gameState.blueTeamScore, x, y, sectionWidth, sectionHeight);
    y += sectionHeight + spacing;

    drawTeamSection('Blue Team', 'rgba(52, 152, 219, 0.8)', gameState.players, 'blue', x, y, sectionWidth);
}

function drawTeamScore(teamName, color, score, x, y, width, height) {
    push();
    textAlign(LEFT, CENTER);
    textSize(20);
    textFont('Helvetica');
    fill(color);
    rect(x, y, width, height, 10);
    fill(255);
    text(`${teamName}: ${Math.round(score) || 0}`, x + 10, y + height / 2);
    pop();
}

function drawTeamSection(teamName, color, players, team, x, y, width) {
    const playerList = Object.values(players).filter(player => player.team === team);
    playerList.sort((a, b) => b.health - a.health);

    const maxPlayersToShow = 10;
    const playersToShow = playerList.slice(0, maxPlayersToShow);

    push();
    textAlign(LEFT, TOP);
    textSize(16);
    textFont('Helvetica');
    fill(255);

    for (const player of playersToShow) {
        fill('rgba(0, 0, 0, 0.6)');
        rect(x, y, width, 30, 10);
        fill(255);
        text(`${player.username.slice(0,10)}`, x + 10, y + 5);
        text(`${Math.round(player.score)} pts`, x + 155, y + 5);
        y += 40;
    }

    pop();

    return y;
}


// Draw a bullet with linear interpolation
function drawBullet(bullet) {
    if (prevState && prevState.bullets && prevState.bullets[bullet.id]) {
        let prevBullet = prevState.bullets[bullet.id];
        let lerpedX = lerp(prevBullet.x, bullet.x, lastTickDiff);
        let lerpedY = lerp(prevBullet.y, bullet.y, lastTickDiff);
        push();

        noStroke();
        fill(SHADOW);
        ellipse(lerpedX + 4, lerpedY + 4, bullet.size);

        fill(bullet.team);

        ellipse(lerpedX, lerpedY, bullet.size);
        pop();
        return;
    }
    // If no previous state or matching bullet found, draw bullet without interpolation
    push();

    noStroke();
    fill(SHADOW);
    ellipse(bullet.x + 2, bullet.y + 2, bullet.size);

    fill(bullet.team);

    ellipse(bullet.x, bullet.y, bullet.size);
    pop();
}

function mouseClicked() {
    if (gameStarted) {
        socket.emit('shoot');
    }
}

function keyPressed() {
    if (key === ' ') {
        socket.emit('layMine');
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
            player.height,
            player.team
        );
        tank.render();

        // Draw the username
        push();
        fill(255);
        textAlign(CENTER);
        textSize(16);
        textFont(customFont);
        text(player.username, tank.x + tank.width / 2, tank.y - 25);
        pop();

        // Draw the health bar
        const healthBarWidth = tank.width;
        const healthBarHeight = 8;
        const healthBarX = tank.x;
        const healthBarY = tank.y - 15;

        push();
        fill(255, 0, 0);
        rect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        pop();

        const currentHealthWidth = (player.health / player.maxHealth) * healthBarWidth;
        push();
        fill(0, 255, 0);
        rect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
        pop();
    }
}


function updateZoom() {
    // Interpolate towards the target scaling factor
    scalingFactor = lerp(scalingFactor, targetScalingFactor, 0.01); // Adjust the interpolation factor (0.1) for the desired smoothness

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

function updateTankInfo() {
    let tankType = document.getElementById('tankTypeSelector').value;
    let info;
    switch (tankType) {
        case 'normal':
            info = 'A balanced tank with average speed and firepower. Bullets bounce twice.';
            break;
        case 'big':
            info = 'A bigger tank with higher durability and slower speed. Bullets bounce twice.';
            break;
        case 'mineLayer':
            info = 'A tank that can lay mines faster. Bullets bounce four times.';
            break;
        case 'sniper':
            info = 'A tank with high damage and high speed bullets. Bullets bounce twice.';
            break;
        case 'speedy':
            info = 'A fast tank with lower durability. Bullets bounce twice.';
            break;
        default:
            info = 'Select a tank type to see its description.';
    }
    document.getElementById('tankInfo').innerText = info;
}