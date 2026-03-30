#!/usr/bin/env node
import { Command } from 'commander';
import { runDoctorCommand } from './commands/doctor.js';
import { runEditCommand } from './commands/edit.js';
import { runInspectCommand } from './commands/inspect.js';

const program = new Command();

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
  .command('edit <input>')
  .description('Edit package metadata')
  .option('--keystore <keystore>', 'keystore file')
  .option('--store-pass <storePass>', 'keystore password')
  .option('--key-alias <keyAlias>', 'key alias')
  .option('--key-pass <keyPass>', 'key password')
  .action(function (input) {
    return runEditCommand(input, this.opts());
  });

await program.parseAsync(process.argv);
