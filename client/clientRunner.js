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
let damageNumbers = [];
let playerTracks = {};
let ping = 0;
let pingStart = performance.now();

let currentFPS = 0;
let frameCount = 0;
let lastUpdate = performance.now();

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

function requestLobbyList() {
    socket.emit('listLobbies');
}

function createLobby() {
    socket.emit('createLobby');
}

document.getElementById('startButton').disabled = true;

function joinLobby(lobbyId) {
    gameState = null;
    prevState = null;
    lastTick = null;
    lastTickDiff = null;
    tiles = [];

    socket.emit('joinLobby', lobbyId);
    document.getElementById('startButton').disabled = false;
}

socket.on('lobbyCreated', (lobbyId) => {
    requestLobbyList();
});

socket.on('disconnect', function() {
    gameState = null;
    prevState = null;
    lastTick = null;
    lastTickDiff = null;
    tiles = [];

    socket.socket.reconnect();
})

socket.on('lobbyList', (lobbyList) => {
    const lobbyListElement = document.getElementById('lobbyList');
    lobbyListElement.innerHTML = ''; // Clear existing list

    lobbyList.forEach((lobby) => {
        const listItem = document.createElement('li');
        listItem.textContent = `Lobby ID: ${lobby.id} - Players: ${lobby.players}/${lobby.maxPlayers}`;
        listItem.addEventListener('click', () => joinLobby(lobby.id)); // Add click event to join lobby
        listItem.style.cursor = 'pointer'; // Change cursor to pointer on hover
        lobbyListElement.appendChild(listItem);
    });
});

function setup() {
    // Create canvas
    createCanvas(windowWidth, windowHeight);

    noCursor();

    // Show the start menu
    document.getElementById('startMenu').style.display = 'block';

    requestLobbyList();

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

    setInterval(() => {
        pingStart = performance.now();
        socket.emit('ping');
    }, 1000);

    socket.on('pong', () => {
        ping = performance.now() - pingStart;
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
    if (gameState && gameState.players[socket.id]) {
        if (gameState.players[socket.id].spawnCooldown > 0) return;
    }
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

    if (mine.timeleft <= 9) {
        fill('#ff4000');
    } else {
        fill('#FFD700');
    }
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
    clear();
    if (gameStarted && gameState) {
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
            let tracks = playerTracks[playerId].tracks;
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
                if (prevState && prevState.bullets[bulletId]) {
                    if (bullet.damage < prevState.bullets[bulletId].damage) {
                        createDamageNumber(bullet.x, bullet.y, prevState.bullets[bulletId].damage - bullet.damage);
                    }
                }
                drawBullet(bullet);
            }
        }

        // Draw players
        if (gameState && gameState.players && prevState) {
            for (let playerId in gameState.players) {
                let player = gameState.players[playerId];
                if (!player.dead && prevState.players[playerId]) {
                    drawPlayer(player, playerId);

                    if (player.health < prevState.players[playerId].health) {
                        createDamageNumber(player.x, player.y, prevState.players[playerId].health - player.health);
                    } else if (player.health > prevState.players[playerId].health + player.regenRate) {
                        createDamageNumber(player.x, player.y, prevState.players[playerId].health - player.health);
                    }

                    // Store player tracks
                    if (!playerTracks[playerId]) {
                        playerTracks[playerId] = {};
                        playerTracks[playerId].tracks = [];
                        playerTracks[playerId].count = 0;
                    }
                    playerTracks[playerId].count++;

                    let threshold = Math.ceil(4 / player.moveSpeed * deltaTime);

                    if (playerTracks[playerId].count >= threshold) {
                        if (prevState && prevState.players[playerId]) {
                            let prevPlayer = prevState.players[playerId];
                            if (prevPlayer.x !== player.x || prevPlayer.y !== player.y) {
                                playerTracks[playerId].tracks.push(new Track(player.x, player.y, player.width, player.height, player.angle));
                            }
                        }
                        playerTracks[playerId].count = 0;
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

        // Update and render damage numbers
        for (let i = damageNumbers.length - 1; i >= 0; i--) {
            const number = damageNumbers[i];
            number.update();
            number.render();
            if (number.timer <= 0) {
                damageNumbers.splice(i, 1); // Remove the damage number when its timer expires
            }
        }

        drawMineExplosions();
        pop();
        // Draw scoreboard
        drawHUD();

        frameCount++;

        if (performance.now() - lastUpdate >= 1000) {
            currentFPS = Math.floor(frameRate());
            frameCount = 0;
            lastUpdate = performance.now();
        }

        push();
        fill(255);
        textSize(20);
        text(`Ping: ${Math.round(ping)} ms`, 20, 30);
        text(`FPS: ${currentFPS}`, 20, 60);
        pop();

    }

    drawCrosshair();
}

function drawHUD() {
    drawScoresAndTeamStats();
    // Display round time left
    push();
    textAlign(CENTER, TOP); // Center text horizontally, align to the top
    textSize(20);
    fill(255);
    const roundTime = [Math.floor((gameState.roundTimeLeft / 20) / 60), Math.floor((gameState.roundTimeLeft / 20) % 60)];
    const rotationTime = [Math.floor((gameState.nextRotation / 20) / 60), Math.floor((gameState.nextRotation / 20) % 60)];

    const timeLeftString = `${roundTime[0]}:${roundTime[1] < 10 ? '0' : ''}${roundTime[1]}`;
    const nextRotation = `${rotationTime[0]}:${rotationTime[1] < 10 ? '0' : ''}${rotationTime[1]}`;

    text(`Time Left: ${timeLeftString}`, width / 2, 20);

    textAlign(CENTER, TOP);
    text(`Next Rotation: ${nextRotation}`, width / 2, height - (height / 20));
    pop();
}

// Function to create damage numbers
function createDamageNumber(x, y, value) {
    damageNumbers.push(new DamageNumber(x, y, value));
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


function drawCrosshair() {
    push();
    translate(mouseX, mouseY);
    strokeWeight(4);
    stroke(0, 255, 0);
    line(-10, 0, 10, 0);
    line(0, -10, 0, 10);
    pop();
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

        if (gameState.players[bullet.owner]) {
            if (gameState.players[bullet.owner].healRate != undefined && bullet.team == gameState.players[socket.id].team) {
                strokeWeight(3);
                stroke(0, 245, 10);
            }
        }

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

function mousePressed() {
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

        if (playerId == socket.id && dist(player.x + player.width / 2, player.y + player.height / 2, gameState.hardPoint.x * tileSize + gameState.hardPoint.height * tileSize / 2, gameState.hardPoint.y * tileSize + gameState.hardPoint.height * tileSize / 2) > 600) {
            push();
            stroke('rgba(0, 255, 0, 0.1)');
            strokeWeight(6);
            line(lerpedPlayerX + player.width / 2, lerpedPlayerY + player.height / 2, gameState.hardPoint.x * tileSize + gameState.hardPoint.height * tileSize / 2, gameState.hardPoint.y * tileSize + gameState.hardPoint.height * tileSize / 2)
            //line(player.x+player.width/2, player.y+player.height/2, gameState.hardPoint.x*tileSize+gameState.hardPoint.height*tileSize/2, gameState.hardPoint.y*tileSize+gameState.hardPoint.height*tileSize/2);
            pop();
        }
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
        case 'healer':
            info = 'A tank that has healing capabilities. Bullets bounce twice.';
            break;
        default:
            info = 'Select a tank type to see its description.';
    }
    document.getElementById('tankInfo').innerText = info;
}