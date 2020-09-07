import { ParticleMath } from "../ParticleMath";

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

    gravity: number;
    size: number;
    direction: number;
    speed: number;
    jitter: number;
}

interface Position {
    x: number;
    y: number;
}

export class Particle {
    // Reference to the canvas
    private canvasContext: CanvasRenderingContext2D;

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
    private jitterForce: number;
    private jitterInterval: number = 0;
    private lastJitter: number;

    // Particle life attributes
    private age: number;
    private lifespan: number;
    private birthdate: number;
    private dead: boolean = false;

    // Size attributes
    private size: number = 1;

    private color: string;

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
     * Set a new drift value.
     * @param drift
     */
    setDrift(drift: number) {
        this.drift = drift;
    }

     /**
      * Main update loop for the Particle. Called from the emitter.
      * 
      * @param timestamp current timestamp of the engine.
      * @param delta time since last loop. The browse may lose focus, and will therefor stop updating the loop. This
      *     value is used to keep the animation in sync with the browser if that happens.
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

        // Apply gravity to the particle
        this.applyGravity();

        // Apply drift, thus aplying a force to the particle
        this.applyDrift();

        // Apply drift, thus aplying a force to the particle
        this.applyJitter(timestamp, delta);

        // Move
        this.x += (this.speed * this.fx) * (delta / 1000);
        this.y += (this.speed * this.fy) * (delta / 1000);
    }

    /**
     * Draws itself to the canvas. This method assumes the canvas has already been cleared.
     */
    render() {
        // If marked to die, don't draw.
        if (this.dead) {
            return;
        }

        this.canvasContext.fillStyle = this.color;
        this.canvasContext.fillRect(this.x, this.y, 10 * this.size, 10 * this.size);
    }

    public isDead(): boolean {
        return this.dead;
    }

    /**
     * Applies a constant force to the y axis of the particle.
     */
    private applyGravity() {
        this.fy += (this.gravity * this.size);
    }

    /**
     * Applies a constant force to the x axis of the particle.
     */
    private applyDrift() {
        this.fx += (this.drift * this.size);
    }
    
    /**
     * Applies the jitter force to the particle.
     */
    private applyJitter(timestamp: number, delta: number) {
        if (this.jitter > 0) {
            // Check if it is time to change the jitter direction.
            if (timestamp - this.lastJitter >= this.jitterInterval) {
                this.jitterForce = ParticleMath.reverseSign(this.jitterForce);
                this.lastJitter = timestamp;
            }
            let framesToNextInterval = (this.jitterInterval - (timestamp - this.lastJitter)) / delta;
            let scale = framesToNextInterval - ((this.jitterInterval / delta) / 2);
            this.fx += (this.jitterForce * scale) / this.speed;
        }
    }
}
