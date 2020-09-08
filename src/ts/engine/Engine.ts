import { RequestAnimationFrame } from "../core/RequestAnimationFrame";
import { Emitter, EmitterOptions } from "../core/Emitter";

// libs
import * as $ from "jquery";

/**
 * This is the core code for the particle engine. Responsible for:
 * 
 * Initializing and starting the browser animation keyframe engine loop.
 * Controlling the emitters.
 * Drawing to the canvas.
 */
export class Engine {

    // The singleton instance of the game engine loop.
    private readonly requestAnimFrame: RequestAnimationFrame;

    // Collection of particle emitters. Each one of these will recieve an update call in the order added.
    private emitters: Emitter[];

    // Canvas rendering context, not the actual canvas itself. This is all that is needed to draw.
    private canvas: HTMLCanvasElement;
    private canvasContext: CanvasRenderingContext2D;

    // Keep track of how many emitters have been created to use as the id
    private emitterIdCount = 0;

    constructor() {
        this.requestAnimFrame = new RequestAnimationFrame();
        this.emitters = [];
    }

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

        // Get the rendering context and set that as the canvas variable
        this.canvasContext = this.canvas.getContext('2d');
    }

    /**
     * Creates a new emitter and adds it to the engine.
     */
    public createEmitter(options?: EmitterOptions): number {
        this.emitterIdCount++;
        let emitter: Emitter = new Emitter(this.emitterIdCount, options);
        emitter.setCanvas(this.canvasContext);
        this.emitters.push(emitter);
        return this.emitterIdCount;
    }

    /**
     * Get the emitter matching the id.
     * @param id
     */
    public getEmitter(id: number) {
        return this.emitters.find((emitter: Emitter) => emitter.getId() === id);
    }

    /**
     * Removes an emitter.
     * @param id
     */
    public removeEmitter(id: number) {
        let emitter: Emitter = this.getEmitter(id);
        this.emitters.splice(this.emitters.indexOf(emitter), 1);
    }

    /**
     * Starts the main particle engine by firing up the requestAnimFrame.
     */
    public start() {
        this.requestAnimFrame.start();
    }

    /**
     * Stops the engine and resets all emitters.
     */
    public stop() {
        this.requestAnimFrame.stop();
        for (let emitter of this.emitters) {
            emitter.reset();
        }
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Pauses the engine to be resumed again by start.
     */
    public pause() {
        this.requestAnimFrame.pause();
    }

    /**
     * Runs the main game engine by calling the run method on the RequestAnimationFrame object.
     */
    public update(timestamp: number) {
        // Clear the canvas
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update the emitters, thus updating the state of every particle
        this.emitters.forEach((emitter: Emitter) => {
            emitter.update(timestamp);
            emitter.render();
        });
    }

}