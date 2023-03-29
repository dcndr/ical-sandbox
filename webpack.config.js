const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        index: {
            import: './src/index.ts',
            dependOn: 'jquery',
        },
        jquery: 'jquery',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            "fs": false
        },
    },
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'public'),
    },
    mode: 'development',
    optimization: {
        runtimeChunk: 'single',
    },
    devServer: {
        devMiddleware: {
            writeToDisk: true,
        },
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({ template: 'src/index.html'}),
    ],
}
