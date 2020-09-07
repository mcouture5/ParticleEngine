import { ParticleEngine } from './ParticleEngine';

let engine = new ParticleEngine();

// Create sample emitter
engine.createEmitter({
    x: -400,
    y: -100,
    width: 800,
    height: 50,
    mode: 'flow',
    gravity: 0.01,
    size: { min: 0.5, max: 3 },
    particleLife: { min: 4000, max: 6000 },
    speed: {min: 100, max: 150},
    angle: { min: 90, max: 90 },
    frequency: { min: 1, max: 1 },
    jitter: 0.2,
    drift: {
        value: 0.02,
        interval: { min: 4000, max: 6000 },
        duration: { min: 1500, max: 3000 }
    }
});

engine.start();