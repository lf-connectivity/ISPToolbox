const path = require('path');

module.exports = {
    entry: '/src/link_check.js',
    module : {
        rules : [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions : ['.tsx', '.ts', 'js'],
    },
    output : {
        filename: 'linkcheck.min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'isptoolboxLinkCheck',
        libraryExport: 'default'
    },
};