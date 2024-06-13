// Add a function to draw hardpoints
function drawHardpoints() {
    if (gameState && gameState.hardPoint) {
        drawHardPoint(gameState.hardPoint, gameState.nextRotation);
    }
}

// Draw a hardpoint
function drawHardPoint(hardPoint, nextRotation) {
    push();
    stroke('rgba(235, 168, 52, 0.5)');
    strokeWeight(2);
    fill('rgba(255, 214, 99, 0.5)');
    rect(hardPoint.x * tileSize, hardPoint.y * tileSize, hardPoint.width * tileSize, hardPoint.height * tileSize);

    fill('rgba(136, 89, 0, 0.8)');
    translate(hardPoint.x * tileSize + hardPoint.height*tileSize/2, hardPoint.y * tileSize + hardPoint.height*tileSize/2+15);
    textAlign(CENTER);
    const rotationTime = [Math.floor((nextRotation / 20) / 60), Math.floor((nextRotation/20)%60)];
    textSize(50);
    text(`${rotationTime[0]}:${rotationTime[1] < 10 ? '0' : ''}${rotationTime[1]}`, 0, 0)
    pop();
}