import { RequestAnimationFrame } from "./RequestAnimationFrame";
import { Emitter, EmitterOptions } from "./Emitter";

// libs
import * as $ from "jquery";

/**
 * This is the core code for the particle engine. Responsible for:
 * 
 * Initializing and starting the browser animation keyframe engine loop.
 * Controlling the emitters.
 * Rendering the scene.
 */
export class Engine {

    // The singleton instance of the game engine loop.
    private readonly requestAnimFrame: RequestAnimationFrame = new RequestAnimationFrame();

    // Collection of particle emitters. Each one of these will recieve an update call in the order added.
    private emitters: Emitter[] = [];

    // Canvas and its rendering context. This rendering context is what is needed to draw.
    private canvas: HTMLCanvasElement;
    private canvasContext: CanvasRenderingContext2D;

    // Keep track of how many emitters have been created to use for id creation
    private emitterIdCount = 0;

    /**
     * Sets up all the necessary functionailiy of the engine (callback, canvas, emitters).
     */
    public initialize() {
        this.requestAnimFrame.setCallback((timestamp: number) => {
            this.update(timestamp);
        });

        // Create the canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = "particleView";
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Append to the proper location
        $('#container').append(this.canvas);

        // Get the rendering context
        this.canvasContext = this.canvas.getContext('2d');
    }

    /**
     * Creates a new emitter and adds it to the engine.
     *
     * @param options customized parameters for the emitter
     * @return unique numeric ID of this emitter
     */
    public createEmitter(options?: EmitterOptions): number {
        this.emitterIdCount++;
        let emitter: Emitter = new Emitter(this.emitterIdCount, this.canvasContext, options);
        this.emitters.push(emitter);
        return this.emitterIdCount;
    }

    /**
     * Get the emitter matching the id.
     * 
     * @param id unique numeric ID of the emitter
     */
    public getEmitter(id: number) {
        return this.emitters.find((emitter: Emitter) => emitter.getId() === id);
    }

    /**
     * Removes an emitter matching the id.
     * 
     * @param id unique numeric ID of the emitter
     */
    public removeEmitter(id: number) {
        this.emitters.splice(this.emitters.indexOf(this.getEmitter(id)), 1);
    }

    /**
     * Starts the main particle engine by firing up the requestAnimFrame. This method is idempotent.
     */
    public start() {
        this.requestAnimFrame.start();
    }

    /**
     * Stops the engine, resets all emitters, and clears the canvas.
     */
    public stop() {
        this.requestAnimFrame.stop();
        for (let emitter of this.emitters) {
            emitter.reset();
        }
        this.clearCanvas();
    }

    /**
     * Pauses the engine to be resumed again by start.
     */
    public pause() {
        this.requestAnimFrame.pause();
    }

    /**
     * Main engie loop. This is provided as the callback to the RequestAnimationFrame class.
     *
     * @param timestamp current engine time. calculated and provided by the RequestAnimationFrame class.
     */
    public update(timestamp: number) {
        // Clear the canvas
        this.clearCanvas();

        // Update and draw each emitter
        this.emitters.forEach((emitter: Emitter) => {
            emitter.update(timestamp);
            emitter.render();
        });
    }

    /**
     * Clear the canvas for drawing.
     */
    private clearCanvas() {
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

}