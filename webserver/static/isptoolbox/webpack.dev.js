// (c) Meta Platforms, Inc. and affiliates
const { ModuleFilenameHelpers } = require('webpack');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CircularDependencyPlugin = require('circular-dependency-plugin')


module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    plugins: [
        new CircularDependencyPlugin({
            // exclude detection of files based on a RegExp
            exclude: /a\.js|node_modules/,
            // include specific files based on a RegExp
            include: /src/,
            // add errors to webpack instead of warnings
            // failOnError: true,
            // allow import cycles that include an asyncronous import,
            // e.g. via import(/* webpackMode: "weak" */ './file.js')
            allowAsyncCycles: false,
            // set the current working directory for displaying module paths
            cwd: process.cwd(),
        })
    ],
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
