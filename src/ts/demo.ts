import { Engine } from './core/Engine';

let Snowflake = './images/snowflake.png';
let Rain = './images/rain.png';
let Firework = './images/firework.png';
let FireworkBlue = './images/firework_b.png';
let FireworkGreen = './images/firework_g.png';
let FireworkOrange = './images/firework_o.png';
let FireworkPurple = './images/firework_p.png';
let FireworkRed = './images/firework_r.png';
let FireworkYellow = './images/firework_y.png';

// Set up emitter configurations
let SnowConfig = {
    x: { min: -600, max: 1400},
    y: { min: -100, max: -100},
    mode: 'flow',
    gravity: 0.01,
    size: { min: 0.5, max: 2 },
    particleLife: { min: 4000, max: 6000 },
    speed: {min: 80, max: 120},
    angle: { min: 90, max: 90 },
    frequency: { min: 1, max: 1 },
    quantity: 5,
    maxParticles: 0,
    jitter: 0.1,
    drift: {
        value: { min: -0.03, max: 0.03 },
        interval: { min: 4000, max: 6000 },
        duration: { min: 2000, max: 3500 }
    },
    image: Snowflake
};

let RainConfig = {
    x: { min: -100, max: 1000},
    y: { min: -100, max: -100},
    mode: 'flow',
    gravity: 0.02,
    size: { min: 1, max: 1.2 },
    particleLife: { min: 4000, max: 6000 },
    speed: {min: 1070, max: 1100},
    angle: { min: 92, max: 95 },
    frequency: { min: 1, max: 1 },
    quantity: 2,
    maxParticles: 0,
    image: Rain
};

// Descriptions for each mode
let SnowDesc = "Gentle snowfall demonstrating the flow mode with a random drift and jitter applied.";
let RainDesc = "Falling rain demonstrating the flow mode and accelerated speed of the particles.";
let FireworkDesc = "Firework display demonstrating the burst mode and random positioning.";
let DefaultDesc = "Configuration demonstrating the default values of the emitter.";

// Empty config to demonstrate the default emitter values
let DefaultConfig = {}

window.addEventListener('load', () => {
    let currentEffect: string = "snow";
    let fireworkEmitterIds = [];

    let engine = new Engine();
    engine.initialize();

    // List of fireworkimages to choose at random
    let fireworkImages = [Firework, FireworkBlue, FireworkGreen, FireworkOrange, FireworkPurple, FireworkRed, FireworkYellow];
    let snowEmitterId = engine.createEmitter(SnowConfig);
    let rainEmitterId = engine.createEmitter(RainConfig);
    let defaultEmitterId = engine.createEmitter(DefaultConfig);

    // Set default description
    let description = document.getElementById("description");
    description.innerText = SnowDesc;
    
    // Register the methods to the global window so thet HTML buttons can call them
    (window as any).Particle = {
        start: function () {
            engine.start();
            if (currentEffect === 'snow') {
                engine.getEmitter(snowEmitterId).start();
                description.innerText = SnowDesc;
            } else if (currentEffect === 'rain') {
                engine.getEmitter(rainEmitterId).start();
                description.innerText = RainDesc;
            } else if (currentEffect === 'default') {
                engine.getEmitter(defaultEmitterId).start();
                description.innerText = DefaultDesc;
            } else {
                for (let emitterId of fireworkEmitterIds) {
                    let emitter = engine.getEmitter(emitterId);
                    emitter.start();
                }
                description.innerText = FireworkDesc;
            }
        },

        play: function() {
            this.start();
        },

        pause: function() {
            engine.pause();
        },

        runEffect: function(effect: string) {
            // Clear old firework emitters
            for (let emitterId of fireworkEmitterIds) {
                engine.removeEmitter(emitterId);
            }
            fireworkEmitterIds = [];

            currentEffect = effect;

            // Create randomness in the fireworks
            if (effect === 'fireworks') {
                let amount = (Math.random() * 8) + 4;
                for (var i = 0; i < amount; i++) {
                    let emitterId = engine.createEmitter({
                        x: { min: 100, max: 700},
                        y: { min: 50, max: 400},
                        mode: 'burst',
                        gravity: 0.0,
                        size: { min: 1, max: 1.2 },
                        particleLife: { min: 500, max: 1000 },
                        speed: {min: 50, max: 150},
                        angle: { min: 0, max: 360 },
                        maxParticles: 250,
                        frequency: { min: 800, max: 1400 },
                        image: fireworkImages[Math.floor(Math.random() * fireworkImages.length)]
                    });
                    fireworkEmitterIds.push(emitterId);
                }
            }
            engine.stop();
            this.start();
        }
    };
});
