/**
 * Engine state, for idempotent reasons.
 */
enum EngineState {
    STOPPED,
    RUNNING
}

/**
 * Container class for the window.requestAnimationFrame logic. This is the main engine loop.
 * 
 * This is preferable over setTimeout as it lets the browser determine when it is the best time to render the next frame.
 */
export class RequestAnimationFrame {
    
    // Engine callback, to be provided by the main Engine class.
    private callback: (timestamp: number) => void;

    // Unique ID provided as the return from window.requestAnimationFrame. Used to stop the loop.
    private animationFrameId: number;

    // Custom engine time. This will only update as the engine is running.
    private engineTime = 0;

    // Local state of the engine.
    private state: EngineState = EngineState.STOPPED;

    /**
     * Sets the callback method to be invoked every frame.
     *
     * @param callback Particle engine callback.
     */
    public setCallback(callback: (timestamp: number) => void) {
        this.callback = callback;
    }

    /**
     * Stops the browser animation frame loop and reset the time. This effectively restarts the engine.
     */
    public stop() {
        window.cancelAnimationFrame(this.animationFrameId);
        this.engineTime = 0;
        this.state = EngineState.STOPPED;
    }

    /**
     * Pauses the engine by cancelling the animation frame but not clearing the game time.
     */
    public pause() {
        window.cancelAnimationFrame(this.animationFrameId);
        this.state = EngineState.STOPPED;
    }

    /**
     * Starts the browser animation frame loop.
     */
    public start() {
        if (this.state == EngineState.RUNNING) {
            return;
        }
        this.state = EngineState.RUNNING;
        this.animationFrameId = window.requestAnimationFrame(() => { this.run(); });
    }

    /**
     * Main run logic of the engine. This is called once for every frame.
     */
    private run() {
        // According to MDN specs, it is advisble to call the request frame again immediately on invocation to ensure
        // the browser receives it on time.
        this.animationFrameId = window.requestAnimationFrame(() => {
            this.run();
        });

        // Keep track of our own engine time. This is to account for the browser losing focus. requestAnimationFrame
        // will pause and the time passed once resumed will not be representative of the actual engime time passed. This
        // is making a bold assumption that we are always running in 60 FPS.
        this.engineTime += ((1 / 60) * 1000);

        // Run the particle engine code
        this.callback(this.engineTime);
    }
}
