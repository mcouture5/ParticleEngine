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
    private callback: (timestamp: number) => void;
    private animationFrameId: number;
    private gameTime = 0;
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
     * Stops the browse animation frame loop, effectively pausing the engine.
     */
    public stop() {
        window.cancelAnimationFrame(this.animationFrameId);
        this.gameTime = 0;
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
     * Starts the browse animation frame loop.
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

        // Keep track of our own game time. This is to account for the browser losing focus. requestAnimationFrame
        // will pause and the time passed once resumed will not be representative of the actual game time passed.
        this.gameTime += ((1 / 60) * 1000);

        // Run the particle engine code
        this.callback(this.gameTime);
    }
}
