const chalk = require('chalk');
module.exports = async function(commander) {
  console.log(
    chalk.keyword('orange')('[?]'),
    `command of \`rc ${commander}\` is not a valid commander.`
  );
};