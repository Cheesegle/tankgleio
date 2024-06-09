const { createNoise2D } = require('simplex-noise');

const noise2D = createNoise2D();

const generateMap = (width, height, scale, threshold) => {
    const array = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                // Set border tiles to 1 (solid border)
                row.push(1);
            } else {
                const nx = x / scale;
                const ny = y / scale;
                const noiseValue = noise2D(nx, ny);
                const binaryValue = noiseValue < threshold ? 0 : 1;
                row.push(binaryValue);
            }
        }
        array.push(row);
    }
    return array;
};

module.exports = {
    generateMap
};
