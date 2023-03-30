const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

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
                include: path.resolve(__dirname, 'src'),
                use: 'ts-loader',
            },
            {
                test: /\.css$/i,
                include: path.resolve(__dirname, 'src'),
                use: ['style-loader', 'css-loader', 'postcss-loader'],
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
        new CleanWebpackPlugin({
            protectWebpackAssets: false,
        }),
        new HtmlWebpackPlugin({ template: 'src/index.html'}),
    ],
}
