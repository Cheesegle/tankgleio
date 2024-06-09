class Player {
  constructor(x, y, angle, turretAngle, color, turretColor, sideColor) {
    this.width = TANK_WIDTH;
    this.height = TANK_HEIGHT;
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