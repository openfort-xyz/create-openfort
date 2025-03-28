import typescript from 'rollup-plugin-typescript2';
import packageJson from './package.json';
import { terser } from 'rollup-plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';

export default [
  {
    input: ['./src/index.ts'],
    output: {
      file: packageJson.exports.import,
      format: 'esm',
    },
    plugins: [
      nodeResolve(),
      commonJs(),
      typescript({
        useTsconfigDeclarationDir: true,
        exclude: 'node_modules/**',
      }),
      terser(),
    ],
  },
];
