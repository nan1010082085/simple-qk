/**
 * @author Yang Dongnan
 * 2021年11月17日
 */
import { EXTENSIONS, rimrafFile } from './utils/rollup.utils';
import Resolve from '@rollup/plugin-node-resolve';
import Commonjs from '@rollup/plugin-commonjs';
import Babel from '@rollup/plugin-babel';
import RollupPluginCopy from 'rollup-plugin-copy';
import VuePlugin from 'rollup-plugin-vue';
import Jsx from 'acorn-jsx';
import { DEFAULT_EXTENSIONS } from '@babel/core';

// rimrafFile();

const plugin = [
  Resolve({
    extensions: EXTENSIONS
  }),
  Commonjs(),
  VuePlugin(),
  Babel({
    extensions: [...DEFAULT_EXTENSIONS, ...EXTENSIONS],
    exclude: 'node_modules/**',
    babelHelpers: 'bundled'
  }),
  RollupPluginCopy({
    targets: [{ src: 'src/typings', dest: 'es' }]
  })
];

export default {
  input: 'es/index.js',
  output: [
    {
      file: 'lib/index.umd.js',
      format: 'umd',
      name: 'SimpleQk',
      globals: {
        vue: 'Vue'
      },
      exports: 'named'
    },
    {
      file: 'lib/index.es.js',
      format: 'es',
      name: 'SimpleQk',
      globals: {
        vue: 'Vue'
      },
      exports: 'named'
    }
  ],
  external: ['vue'],
  acornInjectPlugins: [Jsx()],
  plugins: plugin
};
