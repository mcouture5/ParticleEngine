import { RequestAnimationFrame } from "../core/RequestAnimationFrame";
import { Emitter } from "../core/Emitter";

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
        this.canvas.width = 400;
        this.canvas.height = 400;
        this.canvas.style.position = "absolute";
        this.canvas.style.border = "1px solid";

        // Append to the proper location
        $('#container').append(this.canvas);

        // Get the rendering context and set that as the canvas variable
        this.canvasContext = this.canvas.getContext('2d');
    }

    /**
     * Adds a new emitter to the engine.
     *
     * @param emitter new ParticleEmitter.
     */
    public addEmitter(emitter: Emitter) {
        emitter.setCanvas(this.canvasContext);
        this.emitters.push(emitter);
    }

    /**
     * Starts the main particle engine by firing up the requestAnimFrame.
     */
    public start() {
        this.requestAnimFrame.start();
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