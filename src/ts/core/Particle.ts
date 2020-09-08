import { ParticleMath } from "../util/ParticleMath";

/**
 * Internal options for each Particle.
 */
export interface ParticleOptions {
    /**
     * global x position of the particle
     */
    x: number;
    
    /**
     * global y position of the particle
     */
    y: number;

    /**
     * How long this particle will live in ms. 0 is infinite.
     */
    lifespan: number;

    // Attributes copied from the emitter

    direction: number;
    gravity: number;
    image: HTMLImageElement;
    jitter: number;
    size: number;
    speed: number;
}

export class Particle {
    // Reference to the canvas
    private canvasContext: CanvasRenderingContext2D;

    // Image object to draw.
    private image: HTMLImageElement;

    // global coordinates of this particle
    private x: number;
    private y: number;

    // Movement attributes of the particle
    private speed: number;
    private drift: number = 0;
    private fx: number; // force in the x direction
    private fy: number; // force in the y direction
    private gravity: number;

    // Jitter attributes
    private jitter: number;
    private jitterForce: number = 0;
    private jitterInterval: number = 0;
    private lastJitter: number = 0;

    // Particle life attributes
    private age: number;
    private lifespan: number;
    private birthdate: number;
    private dead: boolean = false;

    // Display attributes
    private size: number = 1;

    constructor(canvasContext: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp, options: ParticleOptions) {
        this.canvasContext = canvasContext;
        this.birthdate = timestamp;
        
        // Copy over all of the options
        for (const key in options) {
            this[key] = options[key]
        }

        // Apply an outward force to propel the particle in the direction specified by its angle
        this.fx = Math.cos(options.direction * (Math.PI/180));
        this.fy = Math.sin(options.direction * (Math.PI/180));

        // If there is a jitter, set up the random interval at which this particle will jitter. The interval and force
        // will scale with the value.
        this.jitter = Math.abs(this.jitter);
        if (this.jitter > 0) {
            // The jitter force will scale up with the jitter value. Higher value means higher force.
            this.jitterForce = ParticleMath.getRandomFloatBetween(this.jitter - 0.1, this.jitter + 0.1);
            // Start with a random direction
            this.jitterForce = ParticleMath.randomizeSign(this.jitterForce);
            this.lastJitter = timestamp;
            
            // Set an initial interval
            let minInterval = Math.max(500 - (this.jitter * 100), 0);
            let maxInterval = Math.max(700 - (this.jitter * 100), 100);
            this.jitterInterval = ParticleMath.getRandomBetween(minInterval, maxInterval);
        }
    }

    /**
     * Set a new drift value. Called from the emitter.
     * 
     * @param drift
     */
    setDrift(drift: number) {
        this.drift = drift;
    }

     /**
      * Main update loop for the Particle. Called from the emitter.
      * 
      * @param timestamp current timestamp of the engine.
      * @param delta time since last loop. This affects the particles movement by applying a factor based on the FPS,
      *     sort of a "catch up" if the FPS drops.
      */
    update(timestamp: number, delta: number) {
        // Update how long this particle has been alive
        this.age = timestamp - this.birthdate;

        // First, check the life of this particle. If it has lived its life to the fullest, kill it.
        if (this.lifespan > 0 && this.age >= this.lifespan) {
            // Mark it as dead. It will be cleaned up after the emitter finishes updating all particles.
            this.dead = true;
        }

        // If marked to die, don't bother with anything else.
        if (this.dead) {
            return;
        }

        // Apply all of the force modifications
        this.applyGravity();
        this.applyDrift();
        this.applyJitter(timestamp, delta);

        // Move at a rate relative to the particle's speed, applied force, and FPS
        this.x += (this.speed * this.fx) * (delta / 1000);
        this.y += (this.speed * this.fy) * (delta / 1000);
    }

    /**
     * Draws itself to the canvas. This method assumes the canvas has already been cleared. If an image was provided, it
     * will be drawn. Otherwise, a white circle is drawn.
     */
    render() {
        // If marked to die, don't draw.
        if (this.dead) {
            return;
        }
        if (this.image) {
            this.canvasContext.drawImage(this.image, this.x, this.y, 10 * this.size, 10 * this.size);
        } else {
            this.canvasContext.beginPath();
            this.canvasContext.arc(this.x, this.y, 10 * this.size, 0, 2 * Math.PI);
            this.canvasContext.fillStyle = 'rgba(255,255,255,1)';
            this.canvasContext.fill();
        }
    }

    public isDead(): boolean {
        return this.dead;
    }

    /**
     * Applies a constant force to the y axis of the particle. Scaled reltaive to the size of the particle.
     */
    private applyGravity() {
        this.fy += (this.gravity * this.size);
    }

    /**
     * Applies a constant force to the x axis of the particle. Scaled reltaive to the size of the particle.
     */
    private applyDrift() {
        this.fx += (this.drift * this.size);
    }
    
    /**
     * Applies the jitter force to the particle.
     *
     * @param timestamp current timestamp of the engine.
     * @param delta time since last loop. This is used to predict the frames to next interval.
     */
    private applyJitter(timestamp: number, delta: number) {
        if (this.jitter > 0) {
            // Check if it is time to change the jitter direction.
            if (timestamp - this.lastJitter >= this.jitterInterval) {
                this.jitterForce = ParticleMath.reverseSign(this.jitterForce);
                this.lastJitter = timestamp;
            }

            // Determine the frames to next interval, used to calculate the force needed to move the particle. This is
            // determined by subtracting the current elapsed time since last jitter from the time to the next jitter,
            // which is finally divided by the FPS.
            let framesToNextInterval = (this.jitterInterval - (timestamp - this.lastJitter)) / delta;

            // Calculate the total amount of frames to the next jitter interval. This is different from
            // framesToNextInterval in that it ignores the current frame.
            let totalFramesToNextInterval = this.jitterInterval / delta;

            // The scale is used to apply enough force in the opposite direction in order to reverse the particle. The
            // scale is a range from positive n to negative n, or vice versa depending on the direction traveled. This
            // is done to provide a "boost" to the particle in order to move it. If this is not done, the particle will
            // not gain enough momentum to reverse its direction. Once it has begun moving in the right direction, more
            // force is applied in that direction to accelerate its movement.
            let scale = framesToNextInterval - (totalFramesToNextInterval / 2);

            // Update the force applied in the x direction based on a factor of the jitter force, scale, and size
            this.fx += ((this.jitterForce * scale) / this.speed) * this.size;
        }
    }
}
