class DamageNumber {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        value<0 ? this.color = color(0, 153, 51) : this.color = color(252, 51, 1)
        this.fadeDuration = 500; 
        this.timer = 1000; 
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
        if(this.value>=0){
            text(`-${Math.round(this.value)}`, this.x, this.y);
        }else{
            text(`+${Math.abs(Math.round(this.value))}`, this.x, this.y);
        }
        pop();
    }
}
