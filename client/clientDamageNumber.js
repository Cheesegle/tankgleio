class DamageNumber {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.color = color(252, 3, 202); // Red color for damage numbers
        this.fadeDuration = 500; // Milliseconds for fade out duration
        this.timer = 1000; // Milliseconds to show the damage number
    }

    update() {
        this.timer -= deltaTime;
    }

    render() {
        push();
        let alpha = map(this.timer, this.fadeDuration, 0, 255, 0); // Fade out alpha value based on timer
        this.color.setAlpha(alpha); // Set alpha value for the color
        fill(this.color);
        textSize(20);
        textAlign(CENTER);
        text(`-${Math.round(this.value)}`, this.x, this.y);
        pop();
    }
}
