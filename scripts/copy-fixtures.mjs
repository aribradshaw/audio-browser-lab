import { cpSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const source = path.resolve('test-fixtures')
const destination = path.resolve('dist', 'test-fixtures')

if (!existsSync(source)) throw new Error(`Fixture source directory is missing: ${source}`)
mkdirSync(path.dirname(destination), { recursive: true })
cpSync(source, destination, { recursive: true, force: true })
console.log(`Copied redistributable fixtures to ${destination}.`)
