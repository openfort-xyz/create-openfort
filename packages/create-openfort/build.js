import fs from 'node:fs'

const config = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

console.log(`Building create-openfort version ${config.version}`)

const file = fs.readFileSync('./src/version.ts', 'utf8')
const lines = file.split('\n')
const versionLine = lines.findIndex((line) => line.includes('export const CLI_VERSION = '))
lines[versionLine] = `export const CLI_VERSION = '${config.version}';`

fs.writeFileSync('./src/version.ts', lines.join('\n'), 'utf8')
