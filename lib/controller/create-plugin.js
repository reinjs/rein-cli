const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { execScript, createFiles, Registry } = require('../utils');
const questions = {
  name: {
    type: 'input',
    name: 'name',
    message: '输入插件名',
    validate(name) {
      if (!name) return '项目名不能为空';
      return /^[a-z0-9_\-\/]+$/.test(name) ? true : '项目名格式不正确';
    }
  },
  type: {
    type: 'input',
    name: 'type',
    message: '输入插件类型',
    validate(name) {
      if (!name) return '插件类型不能为空';
      return /^[a-z0-9_\-]+$/.test(name) ? true : '插件类型格式不正确';
    }
  }
};
module.exports = async ctx => {
  const fields = { name: ctx.params.name };
  const prompt = inquirer.createPromptModule();
  const commonQuestions = [];
  if (!fields.name) commonQuestions.push(questions.name);
  commonQuestions.push(questions.type);
  const commonStep = await prompt(commonQuestions);
  if (!fields.name) fields.name = commonStep.name;
  fields.type = commonStep.type;
  
  const modules = ['@reinjs/rein-class'], files = [];
  const pluginDictionary = path.resolve(process.cwd(), fields.name);
  if (fs.existsSync(pluginDictionary)) {
    throw new Error('插件已存在');
  }
  
  ctx.dbo.on('beforeRollback', async () => await execScript(process.cwd(), 'rm', '-rf', fields.name));
  
  files.push({ file: path.resolve(pluginDictionary, 'app.js'), template: 'app.js.ejs' });
  files.push({ file: path.resolve(pluginDictionary, 'agent.js'), template: 'agent.js.ejs' });
  files.push({ file: path.resolve(pluginDictionary, '.gitignore'), template: 'gitignore.ejs' });
  files.push({ file: path.resolve(pluginDictionary, 'README.md'), template: 'readme.md.ejs', name: fields.name });
  files.push({ file: path.resolve(pluginDictionary, '.install.js'), template: 'install.js.ejs' });
  files.push({
    file: path.resolve(pluginDictionary, 'package.json'),
    template: 'package.json.ejs',
    name: fields.name,
    modules: moduleVersions(modules),
    isPlugin: true,
    type: fields.type
  });
  
  ctx.spinner.start();
  ctx.spinner.name = 'plugin';
  await createFiles(ctx, files);
  ctx.spinner.info('正在检测可用模块源地址...');
  const registry = await Registry();
  ctx.spinner.warn('正在安装依赖，请稍后...', '\n', 'Registry:', registry);
  // 自动安装依赖
  await execScript(pluginDictionary, 'npm', 'install', '--save', '--registry=' + registry, ...modules);
  await execScript(pluginDictionary, 'npm', 'install', '--save-dev', '--registry=' + registry, '@reinjs/rein-cli');
  ctx.spinner.success(
    '项目创建成功！',
    '\n',
    chalk.magenta(`$> cd ${fields.name}`)
  );
};

function moduleVersions(modules) {
  const res = {};
  modules.forEach(modal => {
    res[modal] = '^1.0.0';
  });
  return res;
}
