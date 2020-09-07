import { Particle } from "./Particle";
import { ParticleMath } from "../ParticleMath";

/**
 * Options used when creating each particle. The particle themselves do not have settable options, instead the behavior
 * of each particle is determined by the emitter.
 * 
 * If no options are provided, the default behavior is a burst emitter at position 0,0 with a random speed and life for
 * each particle.
 */
export interface EmitterOptions {
    /**
     * global x position of the emitter
     */
    x?: number;
    
    /**
     * global y position of the emitter
     */
    y?: number;

    /**
     * The width of the emitter will be used to determine the starting x position of the particles. Default is 20.
     */
    width?: number;
    
    /**
     * The height of the emitter will be used to determine the starting y position of the particles. Default is 20.
     */
    height?: number;

    /**
     * Determines how the particles will be emitted and behave after emission.
     * 
     * burst: All particles will be emitted at once. This is the default.
     * flow: Particles will be emitted over time.
     */
    mode?: 'burst' | 'flow';

    /**
     * Apply a constant force to the positive Y direction of the particles. Default is 0. 1 is crazy.
     */
    gravity?: number;

    /**
     * Apply a constant force to the x axis of the particles. Default is 0. 1 is crazy.
     * 
     * A configuration object may be provided to fine tune the drift effect.
     */
    drift?: number | Drift;

    /**
     * The size will change the mass and scale of the object. Bigger sizes are more affected by gravity and drift. The
     * value is represented as a factor. Default is 1.
     */
    size?: Range;

    /**
     * Determines the maximum number of particles to render before the emitter ends. Behaves differently based on the
     * mode. Set to 0 for infinte particles (flow mode only). Default is 1500.
     */
    maxParticles?: number;

    /**
     * Determines how long the particle will live in ms. Default is a range from 2500 to 3000.
     */
    particleLife?: Range;

    /**
     * Delay in ms to emit a new particle after the previous emission. Behaves differently based on the mode.
     * 
     * burst: frequency is ignored. All particles are emitted at once.
     * flow: default is a random amount for each particle, ranging from 100 to 400.
     */
    frequency?: Range;

    /**
     * Determines the direction in degrees from 0 to 360 each particle will travel once emitted. Default is a range from
     * 0 to 360.
     */
    angle?: Range;

    /**
     * Determines the speed in pixels per second of each particle. Default is a range from 100 to 400.
     */
    speed?: Range;

    /**
     * Applies a random directional force on the x-axis of the particle at a random interval. The value is a factor of
     * how much the jitter will affect the particle. A value of 0 means no jitter. Anything above 5 won't be seen
     * because its just too fast.
     */
    jitter?: number;
}

/**
 * Simple range interface containing a min and max. Used for randomization of particle attributes. Set min and max to
 * the same value for a constant rate
 */
interface Range {
    min: number;
    max: number;
}

/**
 * Provides a single config object defining the force and interval for an effect.
 */
interface ForceInterval {
    force: Range;
    interval: Range;
}

/**
 * Option for drift to fine tune the drift capabilites.
 */
interface Drift {
    /**
     * The force to apply to each particle.
     */
    value: number;

    /**
     * How often to apply the drift.
     */
    interval: Range;

    /**
     * How long the drift will remain in effect. The duration is reset at every interval.
     */
    duration: Range;
}

/**
 * Class responsible for the rendering and updating of particles. A particle emitter may only emit one type of particle.
 */
export class Emitter {
    // Reference to the canvas
    private canvasContext: CanvasRenderingContext2D;

    // Collection of all active particles
    private particles: Particle[] = [];

    // Current timestamp of the frame. Received from the engine update callback.
    private timestamp: number;

    // Holds the timestamp in ms of the previously run frame.
    private lastFrame = 0;

    // Record the last time a particle was emitted. Used for flow mode to determine when to create a new particle.
    private lastEmittedTime = 0;

    // True if all particle have been created. Only used is maxParticles is not infinite.
    private allParticlesCreated = false;

    // Drift properties
    private driftInterval: number = 0;
    private lastDriftChange: number = 0;
    private driftTimer: number = 0;
    private driftDuration: number = 0;
    private driftValue: number = 0;
    private driftDecay = 0.001;
    private drifting: boolean = false;

    // Options
    private x: number = 0;
    private y: number = 0;
    private width: number = 20;
    private height: number = 20;
    private mode: 'burst' | 'flow' = 'burst';
    private gravity: number = 0;
    private drift: number | Drift = {
        value: 0,
        interval: { min: 0, max: 0 },
        duration: { min: 0, max: 0 }
    };
    private size: Range = { min: 1, max: 1 };
    private maxParticles: number = 1500;
    private particleLife: Range = { min: 2500, max: 3000 };
    private frequency: Range = { min: 100, max: 400 };
    private angle: Range = { min: 0, max: 360 };
    private speed: Range = { min: 100, max: 400 };
    private jitter: number = 0;

    constructor(options?: EmitterOptions) {
        // Copy over all of the options
        options = options || {};
        for (const key in options) {
            this[key] = options[key]
        }

        // If a drift object was provided, set the initial drift variables
        if (this.isDriftObject(this.drift)) {
            this.driftInterval = ParticleMath.getRandomBetween(this.drift.interval.min, this.drift.interval.max);
            this.driftDuration = ParticleMath.getRandomBetween(this.drift.duration.min, this.drift.duration.max);
        }
    }

    /**
     * Set the canvas rendering context to which the particles will be drawn.
     * @param canvasContext 
     */
    public setCanvas(canvasContext: CanvasRenderingContext2D) {
        this.canvasContext = canvasContext;
    }

    /**
     * Emitter update loop. Called from the main engine loop.
     */
    public update(timestamp: number) {
        // Store the current frame timestamp
        this.timestamp = timestamp;

        // Create any particles if necessary. This will be true on the first update for burst, and on every frequency
        // for flow.
        if (!this.allParticlesCreated) {
            this.createParticlesIfNecessary();
        }

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
        // Go through and render each particle.
        this.particles.forEach((particle: Particle) => {
            particle.render();
        });
    }

    /**
     * Creates the particle objects if necessary. If the mode is flow, a new particle will be created at specified
     * frequency. If the mode is burt, all particles are created at once.
     */
    private createParticlesIfNecessary() {
        switch(this.mode) {
            case 'burst':
                // Create all of the particles in a firework formation
                for (let i: number = 0; i < this.maxParticles; i++) {
                    this.particles.push(this.createParticle());
                }
                this.allParticlesCreated = true;
                break;
            case 'flow':
                // A new particle will be created if the maxParticles is infinte (0) or has not yet been reached.
                if (this.maxParticles === 0 || this.particles.length < this.maxParticles) {
                    // Record the time elapsed since last emission
                    let elapsedSinceEmit = this.timestamp - this.lastEmittedTime;
                    // Get the frequency as a random from the range.
                    let frequency = ParticleMath.getRandomBetween(this.frequency.min, this.frequency.max);
                    if (elapsedSinceEmit >= frequency) {
                        this.particles.push(this.createParticle());
                        this.lastEmittedTime = this.timestamp;

                        // This will never be true for infinite creation, since maxParticles is 0 and 1 particle is
                        // always created here.
                        this.allParticlesCreated = this.particles.length == this.maxParticles;
                    }
                }
                break;
        }
    }

    /**
     * Helper method to create a new particle and determine the options for initializion.
     */
    private createParticle(): Particle {
        // Determine the starting x and y based on the emitters position
        let particleX = ParticleMath.getRandomBetween(this.x, this.x + this.width);
        let particleY = ParticleMath.getRandomBetween(this.y, this.y + this.height);

        // Determine a random lifespan
        let lifespan = ParticleMath.getRandomBetween(this.particleLife.min, this.particleLife.max);

        // Determine an initial direction for the particle.
        let direction = ParticleMath.getRandomBetween(this.angle.min, this.angle.max);

        // Generate a random speed for the particle.
        let speed = ParticleMath.getRandomBetween(this.speed.min, this.speed.max);

        // Generate a random size for the particle.
        let size = ParticleMath.getRandomFloatBetween(this.size.min, this.size.max);

        return new Particle(this.canvasContext, this.timestamp, {
            x: particleX, 
            y: particleY,
            gravity: this.gravity,
            size: size,
            lifespan: lifespan,
            direction: direction,
            speed: speed,
            jitter: this.jitter
        });
    }

    private updateParticle(particle: Particle) {
        // Check if it is time to set a new drift for all of the particles.
        if (this.drift) {
            if (this.isDriftObject(this.drift)) {
                // If it is time to drift and we are not already drifting, being a drift
                if (this.timestamp - this.lastDriftChange > this.driftInterval && !this.drifting) {
                    // Reste the drift value
                    this.driftValue = this.drift.value;
                    this.driftDuration = ParticleMath.getRandomBetween(this.drift.duration.min, this.drift.duration.max);
                    this.lastDriftChange = this.timestamp;
                    this.drifting = true;
                }

                // If we are drifting, check the time elapsed form the start of the drift to see if it is time to stop
                if (this.drifting && this.timestamp - this.lastDriftChange >= this.driftDuration) {
                    // Apply a slow drift to any new particles to act as drag
                    this.driftValue -= this.driftDecay;

                    // Ensure it does not go negative
                    if (this.driftValue < 0) {
                        this.driftValue = 0;

                        // Reset to a new interval
                        this.driftInterval = ParticleMath.getRandomBetween(this.drift.interval.min, this.drift.interval.max);

                        // Reset the last change to begin a new counter
                        this.lastDriftChange = this.timestamp;

                        // No loner drifting
                        this.drifting = false;
                    }
                }

                // Always set the drift
                particle.setDrift(this.driftValue);
            } else {
                particle.setDrift(this.drift);
            }
        }

        // Perform the update last
        particle.update(this.timestamp, this.timestamp - this.lastFrame);
    }

    private isDriftObject(object: any): object is Drift {
        return typeof object === 'number' ? false : 'value' in object;
    }
}
