#!/usr/bin/env node
import { runCli } from './library'

export * from './library'

process.exitCode = await runCli()
