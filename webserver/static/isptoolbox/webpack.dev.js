const { ModuleFilenameHelpers } = require('webpack');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                use: '@jsdevtools/coverage-istanbul-loader',
                exclude: /node_modules/
            }
        ]
    }
});

// Add `coverage-istanbul-loader` to the TS rule
module.exports.module.rules[0].use = ['@jsdevtools/coverage-istanbul-loader', 'ts-loader'];
