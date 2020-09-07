/**
 * Util class to expose some commonly used math functions to the engine.
 */
export class ParticleMath {
    /**
     * Helper method to get a random number between two values with int precision.
     */
    public static getRandomBetween(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    /**
     * Helper method to get a random number between two values with float precision.
     */
    public static getRandomFloatBetween(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Returns a random true/false flag based on math.
     */
    public static getRandomFlag() {
        return Math.random() >= 0.5;
    }
    
    /**
     * Will randomly change the sign of the value from positive to negative, vice versa.
     */
    public static randomizeSign(value: number): number {
        return ParticleMath.getRandomFlag() ? value * -1 : value;
    }
    
    /**
     * Will randomly change the sign of the value from positive to negative, vice versa.
     */
    public static reverseSign(value: number): number {
        return value * -1;
    }
}