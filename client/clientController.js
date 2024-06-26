//get the canvas
var canvas = document.getElementById("game")

var mouseXPos = 0;
var mouseYPos = 0;

//Object that stores the current pressed keys
const playerMovement = {
    up: false,
    down: false,
    left: false,
    right: false
};

//Function that runs whenever a key is pressed, and updates the object
const keyDownHandler = (e) => {
    if (e.keyCode == 39 || e.keyCode == 68) {
        playerMovement.right = true;
    } else if (e.keyCode == 37 || e.keyCode == 65) {
        playerMovement.left = true;
    } else if (e.keyCode == 38 || e.keyCode == 87) {
        playerMovement.up = true;
    } else if (e.keyCode == 40 || e.keyCode == 83) {
        playerMovement.down = true;
    } else if (e.keyCode == 27){
        socket.emit('esc');
    }
};
//Function that runs when a key is released, and updates the object
const keyUpHandler = (e) => {
    if (e.keyCode == 39 || e.keyCode == 68) {
        playerMovement.right = false;
    } else if (e.keyCode == 37 || e.keyCode == 65) {
        playerMovement.left = false;
    } else if (e.keyCode == 38 || e.keyCode == 87) {
        playerMovement.up = false;
    } else if (e.keyCode == 40 || e.keyCode == 83) {
        playerMovement.down = false;
    }
};

//Make the functions run whenever the events happen
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);


// p5.js mouseMoved function
function mouseMoved() {
    if (gameState) {
        if (gameState.players[socket.id]) {
            // Calculate the angle between tank position and mouse position
            mouseXPos = ((mouseX / windowWidth) * scaledWidth) + playerCameraX - (playerWidth / 2);
            mouseYPos = ((mouseY / windowHeight) * scaledHeight) + playerCameraY - (playerHeight / 2);
            const tankX = gameState.players[socket.id].x; // Assuming the tank's x position is stored in gameState
            const tankY = gameState.players[socket.id].y; // Assuming the tank's y position is stored in gameState
            const angle = Math.atan2(mouseYPos - tankY, mouseXPos - tankX);
            playerMovement.mouseAngle = angle;
        }
    }
}

//Send the movement to server 60 times / second
setInterval(() => {
    socket.emit('playerMovement', playerMovement);
}, 1000 / 60);