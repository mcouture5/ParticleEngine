import { Engine } from './engine/Engine';

window.addEventListener('load', () => {
    let Snowflake = './images/snowflake.png';
    let Rain = './images/rain.png';
    let Firework = './images/firework.png';
    let FireworkBlue = './images/firework_b.png';
    let FireworkGreen = './images/firework_g.png';
    let FireworkOrange = './images/firework_o.png';
    let FireworkPurple = './images/firework_p.png';
    let FireworkRed = './images/firework_r.png';
    let FireworkYellow = './images/firework_y.png';

    let currentEffect: string = "snow";
    let fireworkEmitters = [];

    let engine = new Engine();
    engine.initialize();

    // List of fireworkimages to choose at random
    let fireworkImages = [Firework, FireworkBlue, FireworkGreen, FireworkOrange, FireworkPurple, FireworkRed, FireworkYellow];
    let snow = engine.createEmitter({
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
    });

    let rain = engine.createEmitter({
        x: { min: -100, max: 900},
        y: { min: -100, max: -100},
        mode: 'flow',
        gravity: 0.01,
        size: { min: 1, max: 1.2 },
        particleLife: { min: 4000, max: 6000 },
        speed: {min: 470, max: 500},
        angle: { min: 110, max: 110 },
        frequency: { min: 1, max: 1 },
        quantity: 5,
        maxParticles: 0,
        image: Rain
    });

    // Register the methods to the global window so thet HTML buttons can call them
    (window as any).Particle = {
        start: function () {
            engine.start();
            if (currentEffect === 'snow') {
                engine.getEmitter(snow).start();
            } else if (currentEffect === 'rain') {
                engine.getEmitter(rain).start();
            } else {
                for (let emitterId of fireworkEmitters) {
                    let emitter = engine.getEmitter(emitterId);
                    emitter.start();
                }
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
            for (let emitterId of fireworkEmitters) {
                engine.removeEmitter(emitterId);
            }
            fireworkEmitters = [];

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
                    fireworkEmitters.push(emitterId);
                }
            }
            engine.stop();
            this.start();
        }
    };
});
