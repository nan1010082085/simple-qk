import pkg from './package.json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { DEFAULT_EXTENSIONS } from '@babel/core';
import jsx from 'acorn-jsx';
import RollupPluginCopy from 'rollup-plugin-copy';

const config = [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'lib/bundle',
        format: 'cjs',
        name: pkg.name,
        exports: 'named',
        sourcemap: true
      }
    ],
    acornInjectPlugins: [jsx()],
    plugins: [
      commonjs(),
      resolve({
        extensions: ['.tsx', '.ts', '.jsx', '.js']
      }),
      typescript(),
      babel({
        extensions: [...DEFAULT_EXTENSIONS, '.ts', 'tsx'],
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      RollupPluginCopy({
        targets: [{ src: 'src/typings', dest: 'lib/types/src' }]
      })
    ]
  }
];
export default config;
