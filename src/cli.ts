#!/usr/bin/env node
import { Command } from 'commander';
import { runDoctorCommand } from './commands/doctor.js';
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
program.command('edit').description('Edit package metadata');

await program.parseAsync(process.argv);
