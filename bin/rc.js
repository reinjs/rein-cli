#!/usr/bin/env node

'use strict';

const path = require('path');
const pkg = require('../package.json');
const program = require('@reinjs/rein-command');
const NotFoundEvent = require('../lib/event/404');
const ErrorEvent = require('../lib/event/error');
const ExitEvent = require('../lib/event/exit');
const app = new program(path.resolve(__dirname, '..', 'lib'));

app
  .version(pkg.version)
  .on('404', NotFoundEvent)
  .on('error', ErrorEvent)
  .on('exit', ExitEvent);

app.command('app :name([a-z0-9_\\-]+)?', 'middleware/open-spinner', 'controller/create-app');
app.listen();