const path = require('path');

module.exports = {
    entry: {
        wireless_network: '/src/wireless_network.app.js',
    },
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
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'isptoolboxLinkCheck',
        libraryExport: 'default'
    },
};