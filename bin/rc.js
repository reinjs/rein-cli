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
  .on('404', NotFoundEvent(app))
  .on('error', ErrorEvent(app))
  .on('exit', ExitEvent(app));

app.command('new :name([a-z0-9_\\-]+)?', 'middleware/open-spinner', 'controller/create-app');
app.command('add :name([a-zA-Z0-9_\\-\/\.]+)', 'middleware/find-root', 'middleware/find-plugin-addones', 'middleware/open-spinner', 'controller/add-module');

app.listen();