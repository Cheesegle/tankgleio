class Player {
    constructor(x, y, angle, turretAngle, color, turretColor) {
        this.width = 43;
        this.height = 33;
        this.turretBaseSide = 19;
        this.turretNozzleWidth = 21;
        this.turretNozzleHeight = 10;
        this.moveSpeed = 8;

        this.x = x;
        this.y = y;
        this.angle = angle;
        this.turretAngle = turretAngle;
        this.color = color;
        this.turretColor = turretColor;
        this.dead = false;
    }
}
module.exports.Player = Player;