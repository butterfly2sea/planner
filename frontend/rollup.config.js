import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import { copyFileSync, mkdirSync } from 'fs';

const production = !process.env.ROLLUP_WATCH;

// 确保dist目录存在
try {
    mkdirSync('dist', { recursive: true });
} catch (e) {}

// 复制HTML文件
copyFileSync('src/index.html', 'dist/index.html');

export default {
    input: 'src/main.js',
    output: {
        sourcemap: !production,
        format: 'iife',
        name: 'app',
        file: 'dist/bundle.js'
    },
    plugins: [
        // 处理CSS
        css({ output: 'bundle.css' }),

        // 解析node_modules中的模块
        resolve({
            browser: true,
            dedupe: ['maplibre-gl'],
            preferBuiltins: false
        }),

        // 转换CommonJS模块
        commonjs(),

        // 开发服务器
        !production && serve({
            open: true,
            verbose: true,
            contentBase: ['dist'],
            historyApiFallback: true,
            host: 'localhost',
            port: 3001,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        }),

        // 热重载
        !production && livereload('dist'),

        // 生产环境压缩
        production && terser()
    ],
    watch: {
        clearScreen: false
    }
};