import { ParticleEngine } from './ParticleEngine';

let engine = new ParticleEngine();

// Create sample emitter
engine.createEmitter({
    x: 200,
    y: 200,
    width: 200,
    height: 200,
    mode: 'flock',
    gravity: 0.0,
    maxParticles: 100,
    speed: {min: 50, max: 70},
    angle: { min: 90, max: 90 },
    frequency: { min: 50, max: 100 },
    flockInterval: { min: 500, max: 1000 }
});

engine.start();