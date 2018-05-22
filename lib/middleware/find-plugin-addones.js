const fs = require('fs');
const path = require('path');
const is = require('is-type-of');
const utils = require('@reinjs/rein-utils');
module.exports = async (ctx, next) => {
  ctx.plugins = {};
  const configDirName = path.resolve(ctx.projectCwd, 'config');
  const pluginFile = path.resolve(configDirName, 'plugin.js');
  if (!fs.existsSync(pluginFile)) return await next();
  const plugins = utils.loadFile(pluginFile);
  for (const plugin in plugins) {
    const packageName = plugins[plugin].package;
    const packagePath = plugins[plugin].path;

    let commandFile = null;
    if (packagePath) {
      commandFile = path.resolve(configDirName, packagePath, '.commander.js');
      if (!fs.existsSync(commandFile)) {
        commandFile = null;
      }
    }
    
    if (!commandFile && packageName) {
      commandFile = path.resolve(ctx.projectCwd, 'node_modules', packageName, '.commander.js');
      if (!fs.existsSync(commandFile)) {
        commandFile = null;
      }
    }
    
    if (!commandFile) continue;
    const commandExports = utils.loadFile(commandFile);
    if (!is.class(commandExports)) continue;
    ctx.plugins[plugin] = new commandExports(ctx);
  }
  await next();
};