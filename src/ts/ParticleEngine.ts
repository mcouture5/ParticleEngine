import { Engine } from './engine/Engine';

// libs
import * as $ from "jquery";
import { EmitterOptions, Emitter } from './core/Emitter';

/**
 * Main class for the particle engine. This should only be created once for usage in a game.
 */
export class ParticleEngine {

    /**
     * Main game engine. Only one instance of this may be created.
     */
    private readonly engine: Engine;

    constructor() {
        this.engine = new Engine();
        this.engine.initialize();
    }

    /**
     * Beings the game by initializing passed in game state and drawing the scene to the canvas.
     */
    public start () {
        this.engine.start();
    }

    /**
     * Creates a new emitter and adds it to the engine.
     */
    public createEmitter(options?: EmitterOptions) {
        this.engine.addEmitter(new Emitter(options));
    }
}
