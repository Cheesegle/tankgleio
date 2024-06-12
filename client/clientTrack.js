class Track {
	constructor(x, y, tankWidth, tankHeight, tankAngle) {
		this.color = "rgba(0, 0, 0, 0.2)";
		this.x = x;
		this.y = y;
		this.tankWidth = tankWidth;
		this.tankHeight = tankHeight;
		this.angle = tankAngle + Math.PI / 2;
		this.deleteTick = 500;
		this.delete = false;
	}

	update() {
		this.deleteTick--;

		if (this.deleteTick <= 0) {
			this.delete = true;
		}
	}

	render() {
		push();
		noStroke();

        translate((this.x + this.tankWidth / 2), (this.y + this.tankHeight / 2));
        rotate(this.angle);

        const width = this.tankWidth / 5;
        const height = this.tankHeight / 10;

		fill(this.color);
        rect((-this.tankWidth / 4) - width / 2, height / 2, width, height);
        rect((this.tankWidth / 4) - width / 2, height / 2, width, height);

		pop();
	}
}