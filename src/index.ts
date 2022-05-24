import { Command } from 'commander';
import pkg from '../package.json';

export const main = async (): Promise<void> => {
  const program = new Command();
  program
    .name('ctc.ts')
    .description('Crypto Tax Calculator - Calculate your tax liability')
    .version(pkg.version);

  program.arguments('<csv_path>');

  program.option(
    '-p --period <period>',
    'Financial year period (e.g. 2021-07..2022-06)'
  );

  program.parse();

  console.log(program.opts());
  console.log(program.args);
};

main();
