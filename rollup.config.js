/**
 * @author Yang Dongnan
 * 2021年11月17日
 */

import pkg from './package.json';
import Resolve from '@rollup/plugin-node-resolve';
import Typescript from '@rollup/plugin-typescript';
import Commonjs from '@rollup/plugin-commonjs';
import Babel from '@rollup/plugin-babel';
import RollupPluginCopy from 'rollup-plugin-copy';
import VuePlugin from 'rollup-plugin-vue';
import Jsx from 'acorn-jsx';
import { DEFAULT_EXTENSIONS } from '@babel/core';

import fs from 'fs';
import rimraf from 'rimraf';

const fileList = ['es', 'lib'];
fileList.forEach((filename) => {
  if (fs.existsSync(filename)) {
    console.log(`[EXIST OLD FILE] to delete ...`);
    rimraf(filename, {}, () => {
      console.log(`[DELETE] ${filename} success .`);
    });
  }
});

const config = [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'lib',
        format: 'cjs',
        name: pkg.name,
        exports: 'named',
        sourcemap: true
      }
    ],
    external: ['vue'],
    acornInjectPlugins: [Jsx()],
    plugins: [
      Commonjs(),
      Resolve(),
      VuePlugin(),
      Typescript({ include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'] }),
      Babel({
        extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx', '.vue'],
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      RollupPluginCopy({
        targets: [{ src: 'src/typings', dest: 'lib' }]
      })
    ]
  }
];
export default config;
