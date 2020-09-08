const path = require('path');

module.exports = {
    entry: './src/ts/kickstart.ts',
    output: {
        filename: 'particle-engine.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devtool: 'source-map',
    resolve: {
        extensions: [ '.ts', '.js' ],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'awesome-typescript-loader',
                exclude: /node_modules/,
            }
        ],
    },
};
