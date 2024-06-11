class Ripple {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.color = "black";
		this.radius = 5;

		this.opacity = 90;
		this.opacityDec = 5;

		this.speed = 5;
		this.speedDec = 0.01;

		this.remove = false;
	}

	update() {
		this.radius += this.speed;
		this.speed -= this.speedDec;

		this.opacity -= this.opacityDec;

		console.log(this.opacity)

		if (this.opacity <= 0) {
			this.remove = true;
		}
	}

	render() {
		push();

    	strokeWeight(50);
    	tint(255, this.opacity);
		stroke(this.color);
		noFill();
		ellipse(this.x, this.y, this.radius * 2);

		pop();
	}
}