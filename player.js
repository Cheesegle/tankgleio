class Player {
    constructor(x, y, angle, turretAngle, color, turretColor, sideColor) {
        this.width = 43;
        this.height = 33;
        this.turretBaseSide = 19;
        this.turretNozzleWidth = 21;
        this.turretNozzleHeight = 10;

        this.x = x;
        this.y = y;
        this.angle = angle;
        this.turretAngle = turretAngle;
        this.color = color;
        this.turretColor = turretColor;
        this.sideColor = sideColor;
        this.dead = false;
    }
}
module.exports.Player = Player;