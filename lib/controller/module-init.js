const fs = require('fs');
const path = require('path');
const utils = require('@reinjs/rein-utils');
const { commandDecode } = require('@reinjs/rein-command/lib/argv');
const jsbeautifier = require('js-beautify');
module.exports = async ctx => {
  const name = commandDecode(ctx.params.name);
  const files = [
    { file: path.resolve(ctx.projectCwd, 'node_modules', name, '.install.js'), dir: ctx.projectCwd },
    { file: path.resolve(ctx.projectCwd, '.install.js'), dir: process.env.INIT_CWD }
  ].filter(file => fs.existsSync(file.file));
  if (files.length) {
    const installExports = utils.loadFile(files[0].file);
    ctx.projectCwd = files[0].dir;
    if (typeof installExports === 'function') {
      const res = await installExports(ctx, name);
      await init(ctx, res, name);
    }
  }
};

async function init(ctx, res = {}, name) {
  const type = ctx.projectCacheData.plugin.name;
  const pluginFile = path.resolve(ctx.projectCwd, 'config/plugin.js');
  const reinrcFile = path.resolve(ctx.projectCwd, '.reinrc.json');
  const reinrc = utils.loadFile(reinrcFile);
  const envs = reinrc.env || [];
  
  writeFile(ctx, pluginFile, type, {
    enable: true,
    package: name
  });
  
  for (let i = 0 ; i < envs.length; i++) {
    const env = envs[i];
    const distFile = path.resolve(ctx.projectCwd, `config/plugin.${env}.js`);
    writeFile(ctx, distFile, type, res);
  }
}

function writeFile(ctx, pluginFile, type, res) {
  if (fs.existsSync(pluginFile)) {
    const target = utils.loadFile(pluginFile);
    if (!target[type]) {
      const pluginContent = fs.readFileSync(pluginFile, 'utf8');
      fs.writeFileSync(pluginFile, newPluginConfigReplacer(pluginContent, type, res), 'utf8');
      ctx.dbo.on('beforeRollback', async () => fs.writeFileSync(pluginFile, pluginContent, 'utf8'));
    }
  }
}

function newPluginConfigReplacer(content, type, res) {
  return beautiful(content.replace('// new plugin', `"${type}": ` + JSON.stringify(res) + ',\n// new plugin'));
}

function beautiful(str) {
  return jsbeautifier.js_beautify(str, {
    indent_size: 2
  })
}