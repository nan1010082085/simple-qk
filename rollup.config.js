/**
 * @author Yang Dongnan
 * 2021年11月17日
 */
import { EXTENSIONS, rimrafFile } from './utils/rollup.utils';
import pkg from './package.json';
import Resolve from '@rollup/plugin-node-resolve';
import Typescript from '@rollup/plugin-typescript';
import Commonjs from '@rollup/plugin-commonjs';
import Babel from '@rollup/plugin-babel';
import RollupPluginCopy from 'rollup-plugin-copy';
import RollupDel from 'rollup-plugin-delete';
import VuePlugin from 'rollup-plugin-vue';
import Jsx from 'acorn-jsx';
import { DEFAULT_EXTENSIONS } from '@babel/core';

rimrafFile();

const plugin = [
  Commonjs(),
  Resolve({
    extensions: EXTENSIONS
  }),
  VuePlugin(),
  Babel({
    extensions: [...DEFAULT_EXTENSIONS, ...EXTENSIONS],
    exclude: 'node_modules/**',
    babelHelpers: 'bundled'
  })
];

const config = [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'lib',
        format: 'cjs',
        name: pkg.name,
        exports: 'named',
        sourcemap: 'inline'
      }
    ],
    external: ['vue'],
    acornInjectPlugins: [Jsx()],
    plugins: plugin
  },
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'es',
        format: 'es',
        name: pkg.name,
        exports: 'named',
        sourcemap: 'inline'
      }
    ],
    acornInjectPlugins: [Jsx()],
    plugins: [
      ...plugin,
      Typescript({ include: ['src/**/*.ts', 'src/**/*.tsx'] }),
      RollupPluginCopy({
        targets: [{ src: 'src/typings', dest: 'es' }]
      })
    ]
  }
];
export default config;
