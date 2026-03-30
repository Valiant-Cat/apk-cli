#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program.name('apk-cli').description('APK/AAB metadata editor CLI');
program.command('doctor').description('Check toolchain');
program.command('inspect').description('Inspect package metadata');
program.command('edit').description('Edit package metadata');

await program.parseAsync(process.argv);
