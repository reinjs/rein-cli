const chalk = require('chalk');
module.exports = async (err, commander) => {
  console.log(
    chalk.red('[x]'),
    chalk.green('$: rc '+ commander + ' => '),
    err
  );
};