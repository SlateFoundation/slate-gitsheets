#!/usr/bin/env node

// route command line
// eslint-disable-next-line no-unused-expressions
require('yargs')
  .version(require('../package.json').version)
  .commandDir('../commands', { exclude: /\.test\.js$/ })
  .demandCommand()
  .showHelpOnFail(false, 'Specify --help for available options')
  .fail((msg, err) => {
    console.error(msg || err.message)

    if (err) {
      console.error(err.stack)
    }

    process.exit(1)
  })
  .strict()
  .help()
  .argv
