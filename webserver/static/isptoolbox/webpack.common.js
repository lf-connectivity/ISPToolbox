const path = require('path');

module.exports = {
    entry: {
        wireless_network: '/src/wireless_network.app.js',
        market_evaluator: '/src/marketEvalTest.ts',
        dsm_app: '/src/apps/IspToolboxDSMApp.ts',
        login_signup: '/src/login/login_signin.ts',
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
        alias: {
            'mapbox-gl-draw-circle': path.resolve(__dirname, '../mapbox-gl-draw-circle/'),
        },
        extensions : ['.js', '.jsx', '.ts', '.tsx'],
    },
    output : {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'isptoolboxLinkCheck',
        libraryExport: 'default'
    },
};