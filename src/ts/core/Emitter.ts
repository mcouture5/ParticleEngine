import { Particle } from "./Particle";
import { ParticleMath } from "../util/ParticleMath";

/**
 * Options used when creating each particle. The particles themselves do not have settable options, instead the behavior
 * of each particle is determined by the emitter.
 * 
 * If no options are provided, the default behavior is a burst emitter at position 0,0 with a random speed and life for
 * each particle.
 */
export interface EmitterOptions {
    /**
     * global x position of the emitter
     */
    x?: Range;
    
    /**
     * global y position of the emitter
     */
    y?: Range;

    /**
     * Particle image. Drawn to the HTML Canvas.
     */
    image?: any;

    /**
     * Determines the direction in degrees from 0 to 360 each particle will travel once emitted. Default is a range from
     * 0 to 360.
     */
    angle?: Range;

    /**
     * Options to apply a constant force to the x axis of the particles. Default is no drift. A value of 1 is crazy.
     */
    drift?: Drift;

    /**
     * Delay in ms to emit a new particle (or burst of particles) after the previous emission. Default is a range from
     * 300 to 700.
     */
    frequency?: Range;

    /**
     * Apply a constant force to the positive Y direction of the particles. Default is 0. 1 is crazy.
     */
    gravity?: number;

    /**
     * Applies a random directional force on the x-axis of the particle at a random interval. The value is a factor of
     * how much the jitter will affect the particle. A value of 0 means no jitter. Anything above 5 won't be seen
     * because its just too fast.
     */
    jitter?: number;

    /**
     * Determines the maximum number of particles to render before the emitter ends. Set to 0 for infinte particles
     * (flow mode only). Default is 50.
     */
    maxParticles?: number;

    /**
     * Determines how the particles will be emitted and behave after emission.
     * 
     * burst: All particles will be emitted at once. This is the default.
     * flow: Particles will be emitted over time.
     */
    mode?: string;

    /**
     * Determines how long the particle will live in ms. Default is a range from 2500 to 3000.
     */
    particleLife?: Range;

    /**
     * If more particles are desired for the flow mode, this will create a set amount on each frequency. Default is 1.
     */
    quantity?: number;

    /**
     * The size will change the mass and scale of the object. Bigger sizes are more affected by gravity and drift. The
     * value is represented as a factor. Default is 1.
     */
    size?: Range;

    /**
     * Determines the speed in pixels per second of each particle. Default is a range from 100 to 400.
     */
    speed?: Range;
}

/**
 * Simple range interface containing a min and max. Used for randomization of particle attributes. Set min and max to
 * the same value for a constant rate.
 */
interface Range {
    min: number;
    max: number;
}

/**
 * Option for drift to fine tune the drift capabilites.
 */
interface Drift {
    /**
     * The force to apply to each particle.
     */
    value: Range;

    /**
     * How often to apply the drift.
     */
    interval: Range;

    /**
     * How long the drift will remain in effect. The duration is reset at every interval.
     */
    duration: Range;
}

enum EmitterState {
    STOPPED,
    RUNNING
}

/**
 * Class responsible for the rendering and updating of particles. A particle emitter may only emit one type of particle.
 */
export class Emitter {
    // Unique id of the emitter. Provided by the engine.
    private id: number;

    // Reference to the canvas
    private canvasContext: CanvasRenderingContext2D;

    // Current state of the emitter
    private state: EmitterState = EmitterState.STOPPED;

    // Collection of all active particles
    private particles: Particle[] = [];

    // Current timestamp of the frame. Received from the engine update callback.
    private timestamp: number;

    // Holds the timestamp in ms of the previously run frame. Used to provide a time delta to the particle.
    private lastFrame = 0;

    // Record the last time a particle was emitted. Used for flow mode to determine when to create a new particle.
    private lastEmittedTime: number = 0;

    // The next time an emission will occur.
    private nextEmitTime: number = 0;

    // Image attributes, only applicable if an image was provided.
    private imageLoaded: boolean = false;
    private htmlImage: HTMLImageElement;

    // Drift properties
    private driftInterval: number = 0;
    private lastDriftChange: number = 0;
    private driftDuration: number = 0;
    private driftValue: number = 0;
    private drifting: boolean = false;

    // Options
    private x: Range = { min: 0, max: 0 };
    private y: Range = { min: 0, max: 0 };
    private image: string;
    private mode: 'burst' | 'flow' = 'burst';
    private gravity: number = 0;
    private drift: Drift;
    private size: Range = { min: 1, max: 1 };
    private maxParticles: number = 50;
    private particleLife: Range = { min: 2500, max: 3000 };
    private frequency: Range = { min: 300, max: 700 };
    private angle: Range = { min: 0, max: 360 };
    private speed: Range = { min: 100, max: 400 };
    private jitter: number = 0;
    private quantity: number = 1;

    constructor(id: number, canvasContext:CanvasRenderingContext2D, options?: EmitterOptions) {
        this.id = id;
        this.canvasContext = canvasContext;
        // Copy over all of the options
        options = options || {};
        for (const key in options) {
            this[key] = options[key]
        }

        // Set the initial drift variables
        if (this.drift) {
            this.driftInterval = ParticleMath.getRandomBetween(this.drift.interval.min, this.drift.interval.max);
            this.driftDuration = ParticleMath.getRandomBetween(this.drift.duration.min, this.drift.duration.max);
        }

        // Load the image, if one was provided. Otherwise, for simplicity, just assume it was loaded. The particle will
        // just render a circle.
        if (this.image) {
            this.htmlImage = new Image(60, 45);
            this.htmlImage.src = this.image;
            this.htmlImage.onload = () => {
                this.imageLoaded = true;
            };
        } else {
            this.imageLoaded = true;
        }
    }

    /**
     * Returns the unique numeric id of this emitter, provided by the engine.
     * 
     * @return unique numeric id
     */
    public getId(): number {
        return this.id;
    }

    /**
     * Starts the emittter. If the emitter has completed, it will reset and start again. Calling this while running will
     * have no effect.
     */
    public start() {
        this.state = EmitterState.RUNNING;
    }

    /**
     * Resets the emitter back to a startable state.
     */
    public reset() {
        this.state = EmitterState.STOPPED;
        this.timestamp = 0;
        this.lastFrame = 0;
        this.particles = [];
        this.nextEmitTime = 0;
        this.lastEmittedTime = 0;
        this.driftValue = 0;
        if (this.drift) {
            this.driftInterval = ParticleMath.getRandomBetween(this.drift.interval.min, this.drift.interval.max);
            this.driftDuration = ParticleMath.getRandomBetween(this.drift.duration.min, this.drift.duration.max);
        }
        this.lastDriftChange = 0;
        this.drifting = false;
    }

    /**
     * Emitter update loop. Called from the main engine loop.
     * 
     * @param timestamp current engine time
     */
    public update(timestamp: number) {
        if (this.state != EmitterState.RUNNING) {
            return;
        }

        // Store the current frame timestamp
        this.timestamp = timestamp;

        // Create any particles if necessary.
        this.createParticlesIfNecessary();

        // Go through and update each particle's position and appearance.
        this.particles.forEach((particle: Particle) => {
            this.updateParticle(particle);
        });

        // Remove any dead particles
        this.particles = this.particles.filter((particle: Particle) => !particle.isDead());

        // Record now as the previous frame
        this.lastFrame = timestamp;
    }

    /**
     * Emitter render loop. Called from the main engine loop after update.
     */
    public render() {
        // Only render when the image is loaded
        if (this.imageLoaded) {
            // Go through and render each particle.
            this.particles.forEach((particle: Particle) => {
                particle.render();
            });
        }
    }

    /**
     * Creates the particle objects if necessary. If the mode is flow, a new particle will be created at specified
     * frequency. If the mode is burst, all particles are created at once at every frequency.
     */
    private createParticlesIfNecessary() {
        // If it is time to emit, emit based on mode
        if (this.timestamp - this.lastEmittedTime > this.nextEmitTime) {
            // Set the next time to emit
            this.nextEmitTime = ParticleMath.getRandomBetween(this.frequency.min, this.frequency.max);
            
            switch(this.mode) {
                case 'burst':
                    // Determine the starting x and y for all of the particles
                    let xPos = ParticleMath.getRandomBetween(this.x.min, this.x.max);
                    let yPos = ParticleMath.getRandomBetween(this.y.min, this.y.max);
                    for (let i = 0; i < this.maxParticles; i++) {
                        this.particles.push(this.createParticle(xPos, yPos));
                    }
                    this.lastEmittedTime = this.timestamp;
                    break;
                case 'flow':
                    // A new particle will be created if the maxParticles is infinte (0) or has not yet been reached.
                    if (this.maxParticles === 0 || this.particles.length < this.maxParticles) {
                        for (let j = 0; j < this.quantity; j++) {
                            // Determine the starting x and y for each particle
                            let xPos = ParticleMath.getRandomBetween(this.x.min, this.x.max);
                            let yPos = ParticleMath.getRandomBetween(this.y.min, this.y.max);
                            this.particles.push(this.createParticle(xPos, yPos));
                        }
                        this.lastEmittedTime = this.timestamp;
                    }
                    break;
            }
        }
    }

    /**
     * Helper method to create a new particle and determine the options for initialization.
     * 
     * @param x starting x position of the particle
     * @param y starting y position of the particle
     */
    private createParticle(x: number, y: number): Particle {
        return new Particle(this.canvasContext, this.timestamp, {
            x: x, 
            y: y,
            image: this.htmlImage,
            direction: ParticleMath.getRandomBetween(this.angle.min, this.angle.max),
            gravity: this.gravity,
            jitter: this.jitter,
            lifespan: ParticleMath.getRandomBetween(this.particleLife.min, this.particleLife.max),
            size: ParticleMath.getRandomFloatBetween(this.size.min, this.size.max),
            speed: ParticleMath.getRandomBetween(this.speed.min, this.speed.max)
        });
    }

    /**
     * Update the particle's position based on the drift, then call the update method on the aprticle, passing in a time
     * delta so the particle can know how much to move.
     * 
     * @param particle Particle to update
     */
    private updateParticle(particle: Particle) {
        // Check if it is time to set a new drift for all of the particles.
        if (this.drift) {
            // If it is time to drift and we are not already drifting, begin a drift
            if (this.timestamp - this.lastDriftChange > this.driftInterval && !this.drifting) {
                // Reset the drift value
                this.driftValue = ParticleMath.getRandomFloatBetween(this.drift.value.min, this.drift.value.max);

                // Set a new duration
                this.driftDuration = ParticleMath.getRandomBetween(this.drift.duration.min, this.drift.duration.max);
                this.drifting = true;
            }

            // If we are drifting, check the time elapsed form the start of the drift to see if it is time to stop
            if (this.drifting && this.timestamp - this.lastDriftChange >= this.driftDuration) {
                this.driftValue = 0;

                // Reset to a new interval
                this.driftInterval = ParticleMath.getRandomBetween(this.drift.interval.min, this.drift.interval.max);

                // Reset the last change to begin a new counter
                this.lastDriftChange = this.timestamp;

                // No longer drifting
                this.drifting = false;
            }

            // Always update the drift
            particle.setDrift(this.driftValue);
        }

        // Perform the update last
        particle.update(this.timestamp, this.timestamp - this.lastFrame);
    }
}
