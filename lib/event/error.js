const chalk = require('chalk');
const isDev = process.env.NODE_ENV === 'development';
module.exports = app => {
  return async (err, commander) => {
    if (app.spinner) {
      return app.spinner.error(isDev ? err : err.message);
    }
    console.log(
      chalk.red('[x]'),
      chalk.underline(chalk.bold(chalk.red('rc '+ commander + ':'))),
      isDev ? err : err.message
    );
  };
}