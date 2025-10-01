import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.resolve(path.dirname(''));

// Create the CLI entry point that points to the compiled module
const cliEntryPoint = `#!/usr/bin/env node

import './index.mjs'
`;

// Write the entry point file
fs.writeFileSync(path.join(__dirname, 'dist', 'index.js'), cliEntryPoint);

console.log('Build completed - CLI entry point created');
