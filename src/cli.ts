#!/usr/bin/env node
import { Command } from 'commander';
import { runDoctorCommand } from './commands/doctor.js';
import { runEditCommand } from './commands/edit.js';
import { runInstallCommand } from './commands/install.js';
import { runInspectCommand } from './commands/inspect.js';
import {
  runMcpServeCommand,
  runMcpStartCommand,
  runMcpStatusCommand,
  runMcpStopCommand
} from './commands/mcp.js';

const program = new Command();
const parseIntegerOption = (value: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`invalid integer value: ${value}`);
  }

  return parsed;
};

program.name('apk-cli').description('APK/AAB metadata editor CLI');
program
  .command('doctor')
  .description('Check toolchain')
  .option('--json', 'output json')
  .action(function () {
    return runDoctorCommand(this.opts());
  });
program
  .command('inspect <input>')
  .description('Inspect package metadata')
  .option('--json', 'output json')
  .action(function (input) {
    return runInspectCommand(input, this.opts());
  });
program
  .command('install <input>')
  .description('Install APK, XAPK, or AAB to a connected Android device')
  .option('--serial <serial>', 'target adb device serial')
  .option('--replace', 'replace existing package', true)
  .option('--no-replace', 'do not replace existing package')
  .option('--grant', 'grant runtime permissions on install')
  .option('--json', 'output json')
  .action(function (input) {
    return runInstallCommand(input, this.opts());
  });
program
  .command('edit <input>')
  .description('Edit package metadata')
  .option('--keystore <keystore>', 'keystore file')
  .option('--store-pass <storePass>', 'keystore password')
  .option('--key-alias <keyAlias>', 'key alias')
  .option('--key-pass <keyPass>', 'key password')
  .option('--output <output>', 'output file')
  .option('--app-name <appName>', 'application name')
  .option('--icon <icon>', 'icon file')
  .option('--version-name <versionName>', 'version name')
  .option('--version-code <versionCode>', 'version code')
  .option('--package-name <packageName>', 'package name')
  .option('--json', 'output json')
  .action(function (input) {
    return runEditCommand(input, this.opts());
  });

const mcp = program.command('mcp').description('Manage MCP server');

mcp
  .command('serve')
  .description('Run MCP server in the foreground')
  .option('--host <host>', 'host to bind', '127.0.0.1')
  .option('--port <port>', 'port to bind', parseIntegerOption, 39039)
  .option('--state-file <stateFile>', 'state file path')
  .action(function () {
    return runMcpServeCommand(this.opts());
  });

mcp
  .command('start')
  .description('Start MCP server in the background')
  .option('--host <host>', 'host to bind', '127.0.0.1')
  .option('--port <port>', 'port to bind', parseIntegerOption, 39039)
  .option('--state-file <stateFile>', 'state file path')
  .option('--startup-timeout <startupTimeout>', 'startup timeout in milliseconds', parseIntegerOption, 15000)
  .action(function () {
    return runMcpStartCommand(this.opts());
  });

mcp
  .command('stop')
  .description('Stop managed MCP server')
  .option('--state-file <stateFile>', 'state file path')
  .action(function () {
    return runMcpStopCommand(this.opts());
  });

mcp
  .command('status')
  .description('Show managed MCP server status')
  .option('--state-file <stateFile>', 'state file path')
  .action(function () {
    return runMcpStatusCommand(this.opts());
  });

await program.parseAsync(process.argv);
