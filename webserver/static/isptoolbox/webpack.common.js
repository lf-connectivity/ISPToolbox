const path = require('path');

module.exports = {
    entry: {
        wireless_network: '/src/apps/wireless_network.app.ts',
        market_evaluator: '/src/apps/MarketEvaluatorApp.ts',
        dsm_app: '/src/apps/IspToolboxDSMApp.ts',
        login_signup: '/src/login/login_signin.ts',
        latest_lidar: '/src/apps/LatestLiDARApp.ts',
        multiplayer_test: '/src/apps/MultiplayerDemoApp.ts',
        market_eval_test: '/src/apps/MarketEvaluatorTestApp.ts',
        solar_sizing: '/src/apps/SolarSizingApp.ts'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(png|jpe?g|svg)$/,
                loader: 'file-loader',
                options: {
                    name: 'assets/[name].[ext]'
                }
            }
        ]
    },
    resolve: {
        alias: {
            'mapbox-gl-draw-circle': path.resolve(__dirname, '../mapbox-gl-draw-circle/')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'isptoolbox',
        libraryExport: 'default'
    }
};
