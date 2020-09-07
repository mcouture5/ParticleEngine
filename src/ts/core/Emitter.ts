import { Particle } from "./Particle";

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
     * flock: Particles will be emitted at once then change their behavior as they continue to live.
     */
    mode?: 'burst' | 'flow' | 'flock';

    /**
     * Apply a constant force to the positive Y direction of the particles. Default is 0. 1 is crazy.
     */
    gravity?: number;

    /**
     * Determines the maximum number of particles to render before the emitter ends. Behaves differently based on the
     * mode.
     * 
     * burst or flock: No more than 1500 particles will be generated.
     * flow: Set to 0 for infinte particles.
     */
    maxParticles?: number;

    /**
     * Determines how long the particle will live in ms. Behaves differently based on the mode.
     * 
     * burst or flow: Default is a range from 500 to 2000. Infinite may not be set.
     * flock: Default is 0 for infinite.
     */
    particleLife?: Range;

    /**
     * Delay is ms to emit a new particle after the previous emission. Behaves differently based on the mode.
     * 
     * burst or flock: frequency is ignored. All particles are emitted at once.
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
     * Sets a drift on each particle in the specified direction. Default is none.
     */
    drift?: 'none' | 'x-axis' | 'y-axis' | 'both';

    /**
     * Set a random drift value on a particle. The value is representative of how much force will be applied at a
     * constant rate. 0 will apply no force. A negative value will apply a force in the opposite direction. The
     * direction is determined by the drift attribute. Default is 0.
     */
    driftValue?: Range;

    /**
     * How often the drift value on a particle will change in ms. At every interval, a new driftValue will be
     * determined. Default is 0.
     */
    driftInterval?: Range;

    /**
     * How often in ms the flock will change direction. Default is a range from 1500 to 2000. Only applied when mode is
     * flock.
     */
    flockInterval?: Range;
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
 * Class responsible for the rendering and updating of particles. A particle emitter may only emit one type of particle.
 */
export class Emitter {
    // Reference to the canvas
    private canvasContext: CanvasRenderingContext2D;
    private particles: Particle[] = [];

    // Current timestamp of the frame
    private timestamp: number;

    // Holds the timestamp in ms of the previously run frame
    private lastFrame = 0;

    // Record the last time a particle was emitted. Used for flow mode to determine when to create a new particle.
    private lastEmittedTime = 0;

    // True if all particle have been created. Only used is maxParticles is not infinite.
    private allParticlesCreated = false;

    // Flock interval, both the passed in range for randomness and the last flock movement
    private flockInterval: Range;
    private lastFlock: number;
    private nextFlock: number;
    private particleFlockInterval: number;
    private flockMeta: { x: number, y: number, interval: number };

    // Options
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private mode: 'burst' | 'flow' | 'flock';
    private gravity: number;
    private maxParticles: number;
    private particleLife: Range;
    private frequency: Range;
    private angle: Range;
    private speed: Range;
    private drift: 'none' | 'x-axis' | 'y-axis' | 'both';
    private driftValue: Range;
    private driftInterval: Range;

    constructor(options?: EmitterOptions) {
        options = options || {};
        // Copy over all of the options, providing defaults
        this.x = options.x;
        this.y = options.y;
        this.width = options.width || 20;
        this.height = options.height || 20;
        this.mode = options.mode || 'burst';
        this.gravity = options.gravity || 0;
        this.frequency = options.frequency || { min: 100, max: 400 };
        this.angle = options.angle || { min: 0, max: 360 };
        this.speed = options.speed || { min: 100, max: 400 };
        this.drift = options.drift || 'none';
        this.driftValue = options.driftValue || { min: 0, max: 0 };
        this.driftInterval = options.driftInterval || { min: 0, max: 0 };
        this.flockInterval = options.flockInterval || { min: 1500, max: 2000 };

        // Max particles. Adjusted based on mode.
        let maxParticles = options.maxParticles || 1500;
        if (this.mode === 'burst') {
            maxParticles = Math.min(maxParticles, 1500)
        }
        this.maxParticles = maxParticles;

        // Particle life. Default to infine then adjusted based on mode.
        let particleLife = options.particleLife || { min: 0, max: 0 };
        if (this.mode === 'burst' || this.mode === 'flow') {
            if (particleLife.max === 0) {
                particleLife = { min: 500, max: 2000 };
            }
        }
        this.particleLife = particleLife;

        // Set up the next flock movement
        this.lastFlock = 0;
        this.nextFlock = this.getRandomBetween(this.flockInterval.min, this.flockInterval.max);
    }

    public setCanvas(canvasContext: CanvasRenderingContext2D) {
        this.canvasContext = canvasContext;
    }

    /**
     * Emitter update loop. Called from the main engine loop.
     */
    public update(timestamp: number) {
        // Store the current frame timestamp
        this.timestamp = timestamp;

        // Create any particles if necessary. This will be true on the first update for burst or flock, and on every
        // frequency for flow.
        if (!this.allParticlesCreated) {
            this.createParticlesIfNecessary();
        }

        // Reset the particle flock interval to be later incremented
        if (this.mode === 'flock' && this.timestamp - this.lastFlock > this.nextFlock) {
            this.particleFlockInterval = 50;
            // Create a new behavior object, to be added to each particle flock queue
            this.flockMeta = {
                x: this.getRandomBetween(0, this.width),
                y: this.getRandomBetween(0, this.height),
                interval: 20
            };
            this.lastFlock = timestamp;
            this.nextFlock = this.getRandomBetween(this.flockInterval.min, this.flockInterval.max);
        }

        // Go through and update each particle's position and appearance.
        this.particles.forEach((particle: Particle) => {
            this.updateParticle(particle);
        });

        // Clear the flock meta each time, it is used to determine when to apply flock to a particle, and that should
        // only happen for one loop.
        this.flockMeta = null;

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

    private getRndColor() {
        var r = 255*Math.random()|0,
            g = 255*Math.random()|0,
            b = 255*Math.random()|0;
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    /**
     * Creates the particle objects if necessary. If the mode is flow, a new particle will be created at specified
     * frequency. If the mode is burt or flock, all particles are created at once.
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
            case 'flock':
                let radius = 0;
                // Create all of the particles in a slowly expanding radius
                for (let i: number = 0; i < this.maxParticles; i++) {
                    radius = i;
                    var pt_angle = Math.random() * 2 * Math.PI;
                    var pt_radius_sq = Math.random() * radius * radius;
                    var pt_x = Math.sqrt(pt_radius_sq) * Math.cos(pt_angle);
                    var pt_y = Math.sqrt(pt_radius_sq) * Math.sin(pt_angle);
                    let particle = this.createParticle();
                    particle.setPosition(this.x + pt_x, this.y + pt_y);


                    particle.setColor('rgb(' + i + ',' + i + ',' + i + ')');

                    this.particles.push(particle);
                }
                this.allParticlesCreated = true;
                break;
            case 'flow':
                // A new particle will be created if the maxParticles is infinte (0) or has not yet been reached.
                if (this.maxParticles === 0 || this.particles.length < this.maxParticles) {
                    // Record the time elapsed since last emission
                    let elapsedSinceEmit = this.timestamp - this.lastEmittedTime;
                    // Get the frequency as a random from the range.
                    let frequency = this.getRandomBetween(this.frequency.min, this.frequency.max);
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
        let particleX = this.getRandomBetween(this.x, this.x + this.width);
        let particleY = this.getRandomBetween(this.y, this.y + this.height);

        // Determine a random lifespan
        let lifespan = this.getRandomBetween(this.particleLife.min, this.particleLife.max);

        // Determine an initial direction for the particle.
        let direction = this.getRandomBetween(this.angle.min, this.angle.max);

        // Generate a random speed for the particle.
        let speed = this.getRandomBetween(this.speed.min, this.speed.max);

        // Generate a random drift interval for the particle
        let driftInterval = this.getRandomBetween(this.driftInterval.min, this.driftInterval.max);

        return new Particle(this.canvasContext, this.timestamp, {
            x: particleX, 
            y: particleY,
            gravity: this.gravity,
            lifespan: lifespan,
            direction: direction,
            speed: speed,
            driftInterval: driftInterval
        });
    }

    private updateParticle(particle: Particle) {
        if (this.flockMeta) {
            this.updateFlock(particle);
        }
        // Check if it is time to set a new drift. If so, change it and set a new interval for the particle.
        if (this.drift !== 'none' && particle.readyForDriftChange(this.timestamp)) {
            this.updateParticleDrift(particle);
        }

        // Perform the update last
        particle.update(this.timestamp, this.timestamp - this.lastFrame);
    }

    /**
     * Update the flock of particles by changing the drection of each particle at a much smaller interval between the
     * overall drift interval. This gives the effect of a "leader" particle that all the other particles will follow.
     */
    private updateFlock(particle: Particle) {
        // Increment the particle flock interval to simulate a delay in movement for later particles
        this.particleFlockInterval += 5;
        particle.updateFlock(this.flockMeta.x, this.flockMeta.y, this.particleFlockInterval);
    }

    /**
     * Calculates and sets a random drift for the particle based on the drift properties. This is done in the Emitter
     * to support the flock mode.
     */
    private updateParticleDrift(particle: Particle) {
        let driftX = 0;
        let driftY = 0;
        // Get random drift values based on the drift type
        if (this.drift === 'x-axis' || this.drift === 'both') {
            driftX = this.getRandomFloatBetween(this.driftValue.min, this.driftValue.max);
        }
        if (this.drift === 'y-axis' || this.drift === 'both') {
            driftY = this.getRandomFloatBetween(this.driftValue.min, this.driftValue.max);
        }

        particle.setDrift(driftX, driftY);
        particle.setDriftIntrval(this.getRandomBetween(this.driftInterval.min, this.driftInterval.max), this.timestamp);
    }

    /**
     * Helper method to get a random number between two values.
     */
    private getRandomBetween(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    /**
     * Helper method to get a random number between two values.
     */
    private getRandomFloatBetween(min: number, max: number) {
        return Math.random() * (max - min + 1) + min;
    }
}
