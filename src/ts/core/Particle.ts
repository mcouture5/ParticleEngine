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
    direction: number;
    speed: number;
    driftInterval: number;
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
    private driftX: number = 0;
    private driftY: number = 0;
    private driftInterval: number;
    private driftRate = 0.005; //constant rate of acceleration for the drift
    private lastDriftChange: number = 0;
    private fx: number; // force in the x direction
    private fy: number; // force in the y direction
    private gravity: number;

    // Flock attributes
    private flockQueue: Array<{ x: number, y: number, interval: number }> = [];
    private lastFlocked: number = 0;
    private flockInterval: number = 0;
    private destination: Position;

    // Particle life attributes
    private age: number;
    private lifespan: number;
    private birthdate: number;
    private dead: boolean = false;

    private color: string;

    constructor(canvasContext: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp, options: ParticleOptions) {
        this.canvasContext = canvasContext;
        this.x = options.x;
        this.y = options.y;
        this.gravity = options.gravity;
        this.lifespan = options.lifespan;
        this.speed = Math.abs(options.speed);
        this.birthdate = timestamp;

        // this.color = this.getRndColor();

        this.setDriftIntrval(options.driftInterval, timestamp);

        // Apply an outward force to propel the particle in the direction specified by its angle
        this.fx = Math.cos(options.direction * (Math.PI/180));
        this.fy = Math.sin(options.direction * (Math.PI/180));
    }

    /**
     * Sets the direction of the particle in degrees. Changing this in real time will apply force in the new direction, leading to
     * a smooth change in movement.
     */
    setDirection(direction: number) {
        this.fx = Math.cos(direction * (Math.PI/180));
        this.fy = Math.sin(direction * (Math.PI/180));
    }

    setDriftIntrval(driftInterval: number, timestamp: number) {
        this.driftInterval = driftInterval;
        this.lastDriftChange = timestamp;
    }

    setDrift(x: number, y:number) {
        this.driftX = x;
        this.driftY = y;
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setColor(color: string) {
        this.color = color;
    }

    updateFlock(x: number, y: number, interval: number) {
        this.flockQueue.push({
            x: x,
            y: y,
            interval: interval
        });
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

        // Apply the flock momentum. This is done after drift because it uses drift to simulate movement.
        if (this.flockQueue.length && timestamp - this.lastFlocked > this.flockInterval) {
            let behavior = this.flockQueue.shift();
            this.destination = { x: behavior.x, y: behavior.y };
            this.lastFlocked = timestamp;
            this.flockInterval = behavior.interval;
        }

        if (this.destination) {
            // Get the angle to the destination
            let angle = Math.atan2(this.destination.y - this.y, this.destination.x - this.x);

            // Apply a force in the direction of the angle. Damper it based on the speed.
            this.fx += Math.cos(angle) / this.speed;
            this.fy += Math.sin(angle) / this.speed;
        }

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
        this.canvasContext.fillRect(this.x, this.y, 10, 10);
    }

    public isDead(): boolean {
        return this.dead;
    }

    /**
     * Returns true if this particle is ready for a drift change. This is determined by the different between the
     * current time and the last drift change.
     */
    public readyForDriftChange(timestamp: number) {
        return timestamp - this.lastDriftChange >= this.driftInterval;
    }

    private getRndColor() {
        var r = 255*Math.random()|0,
            g = 255*Math.random()|0,
            b = 255*Math.random()|0;
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    /**
     * Applies a gravity to the y axis of the particle. Gravity is a constant force.
     */
    private applyGravity() {
        this.fy += this.gravity;
    }

    /**
     * Using the drift set from the emitter, apply a force in the drift direction. A negative drift moves left, and a
     * positive moves right.
     */
    private applyDrift() {
        // Accelerate along the x axis until the desired drift force has been reached
        if (this.driftX < 0 && (this.fx > this.driftX)) {
            this.fx -= this.driftRate; // accelerate left
        } else if (this.driftX > 0 && (this.fx < this.driftX)) {
            this.fx += this.driftRate; // accelerate right
        }

        // Accelerate along the y axis until the desired drift force has been reached
        if (this.driftY < 0 && (this.fy > this.driftY)) {
            this.fy -= this.driftRate; // accelerate up
        } else if (this.driftY > 0 && (this.fy < this.driftY)) {
            this.fy += this.driftRate; // accelerate down
        }
    }
}
