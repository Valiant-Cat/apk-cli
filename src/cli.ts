#!/usr/bin/env node
import { Command } from 'commander';
import { runDoctorCommand } from './commands/doctor.js';

const program = new Command();

program.name('apk-cli').description('APK/AAB metadata editor CLI');
program
  .command('doctor')
  .description('Check toolchain')
  .option('--json', 'output json')
  .action(function () {
    return runDoctorCommand(this.opts());
  });
program.command('inspect').description('Inspect package metadata');
program.command('edit').description('Edit package metadata');

await program.parseAsync(process.argv);
