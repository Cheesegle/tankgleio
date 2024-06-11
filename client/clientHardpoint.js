// Add a function to draw hardpoints
function drawHardpoints() {
    if (gameState && gameState.hardPoint) {
        drawHardPoint(gameState.hardPoint);
    }
}

// Draw a hardpoint
function drawHardPoint(hardPoint) {
    push();
    noStroke();
    fill('rgba(255, 214, 99, 0.5)');
    rect(hardPoint.x * tileSize, hardPoint.y * tileSize, hardPoint.width * tileSize, hardPoint.height * tileSize);
    pop();
}