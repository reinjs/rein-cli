/**
 * 询问：
 *  1. 运行环境？
 *  2. 是否使用Cluster多进程模式？
 *    [是]
 *    1. 使用何种Framework架构？
 *    2. Agents子进程名称(如果不使用请跳过)
 *    3. 进程启动超时时间(默认30秒)
 *    4. 启动多少个子进程协同分流？(默认根据CPU个数)
 *    [否]
 *    1. 使用何种Framework架构？
 * @param ctx
 * @returns {Promise<void>}
 */
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const flatten = require('array-flatten');
const inquirer = require('inquirer');
const jsbeautifier = require('js-beautify');
const { execScript, cname, renderFileSync, Ping } = require('../utils');
const questions = {
  name: {
    type: 'input',
    name: 'name',
    message: '输入项目名',
    validate(name) {
      if (!name) return '项目名不能为空';
      return /^[a-z0-9_\-]+$/.test(name) ? true : '项目名格式不正确';
    }
  },
  env: {
    type: 'input',
    name: 'env',
    message: '输入项目运行环境，请使用英文逗号分割',
    default: 'dev,stable,product'
  },
  mode: {
    type: 'confirm',
    name: 'mode',
    message: '是否使用Cluster多进程模式？'
  },
  framework: {
    type: 'list',
    name: 'framework',
    message: '使用何种Framework架构？',
    choices: ['@reinjs/rein'],
    default: '@reinjs/rein'
  },
  agents: {
    type: 'input',
    name: 'agents',
    message: '输入Agent辅助进程集合(如果不使用请跳过，比如`book,example,tracks`)，请使用英文逗号分割'
  },
  timeout: {
    type: 'input',
    name: 'timeout',
    message: '请输入进程启动超时时间',
    default: 10000,
    validate(time) {
      if (isNaN(time)) return '请输入数字';
      return true;
    }
  },
  maxWorkers: {
    type: 'input',
    name: 'maxWorkers',
    message: '启动多少个子进程协同分流？(默认根据CPU个数)',
    validate(total) {
      if (!total) return true;
      if (isNaN(total)) return '请输入数字';
      return true;
    },
  },
  setup: {
    type: 'confirm',
    name: 'setup',
    message: '是否自动安装依赖？'
  },
};

module.exports = async ctx => {
  const fields = { name: ctx.params.name, configs: {} };
  const prompt = inquirer.createPromptModule();
  const commonQuestions = [];
  if (!fields.name) commonQuestions.push(questions.name);
  commonQuestions.push(questions.env, questions.mode, questions.framework, questions.setup);
  const commonStep = await prompt(commonQuestions);
  if (commonStep.name) fields.name = commonStep.name;
  fields.env = commonStep.env.split(',');
  fields.mode = commonStep.mode ? 'cluster' : 'single';
  fields.framework = commonStep.framework;
  fields.setup = commonStep.setup;
  
  if (fields.mode === 'cluster') {
    const clusterStep = await prompt([questions.agents, questions.timeout, questions.maxWorkers]);
    fields.configs.timeout = Number(clusterStep.timeout);
    if (clusterStep.agents) {
      fields.configs.agents = clusterStep.agents.split(',');
    }
    if (clusterStep.maxWorkers) {
      fields.configs.maxWorkers = Number(clusterStep.maxWorkers);
    }
  }
  
  /**
   * 开始创建文件
   */
  const modules = ['@reinjs/rein-class'], files = [];
  const projectDictionary = path.resolve(process.cwd(), fields.name);
  if (fs.existsSync(projectDictionary)) {
    throw new Error('项目已存在');
  }
  
  ctx.dbo.on('beforeRollback', async () => await execScript(process.cwd(), 'rm', '-rf', fields.name));
  
  if (fields.mode === 'cluster') modules.push('@reinjs/rein-cluster');
  modules.push(fields.framework);
  
  
  if (fields.mode === 'cluster') {
    files.push({
      file: path.resolve(projectDictionary, 'index.js'),
      template: 'index.cluster.js.ejs',
      agents: fields.configs.agents,
      timeout: fields.configs.timeout,
      framework: fields.framework,
      maxWorkers: fields.configs.maxWorkers
    });
  } else {
    files.push({
      file: path.resolve(projectDictionary, 'index.js'),
      template: 'index.single.js.ejs',
      framework: fields.framework
    });
  }
  
  files.push({ file: path.resolve(projectDictionary, 'app.js'), template: 'app.js.ejs' });
  files.push({ file: path.resolve(projectDictionary, 'config/plugin.js'), template: 'config.plugin.js.ejs' });
  files.push(...flatten(fields.env.map(env => {
    return [
      {
        file: path.resolve(projectDictionary, `config/config.${env}.js`),
        template: 'config.config.env.js.ejs'
      },
      {
        file: path.resolve(projectDictionary, `config/plugin.${env}.js`),
        template: 'config.plugin.env.js.ejs'
      }
    ];
  })));
  if (fields.configs.agents) {
    files.push(...flatten(fields.configs.agents.map(agent => {
      return [
        {
          file: path.resolve(projectDictionary, agent + '.js'),
          template: 'agent.js.ejs'
        },
        {
          file: path.resolve(projectDictionary, `app/${agent}.js`),
          template: 'app.agent.js.ejs'
        }];
    })));
  }
  
  files.push({ file: path.resolve(projectDictionary, 'app/router.js'), template: 'app.router.js.ejs', init: true });
  files.push({ file: path.resolve(projectDictionary, 'app/controller/index.js'), template: 'app.controller.js.ejs', init: true, cname: cname('index', 'controller') });
  files.push({ file: path.resolve(projectDictionary, 'app/middleware/index.js'), template: 'app.middleware.js.ejs' });
  files.push({ file: path.resolve(projectDictionary, 'app/service/index.js'), template: 'app.service.js.ejs', init: true, cname: cname('index', 'service') });
  files.push({ file: path.resolve(projectDictionary, 'app/extend/context.js'), template: 'app.extend.context.js.ejs', init: true });
  files.push({ file: path.resolve(projectDictionary, 'app/extend/request.js'), template: 'app.extend.request.js.ejs', init: true });
  files.push({ file: path.resolve(projectDictionary, 'app/extend/response.js'), template: 'app.extend.response.js.ejs', init: true });
  files.push({ file: path.resolve(projectDictionary, 'app/extend/application.js'), template: 'app.extend.application.js.ejs', init: true });
  
  files.push({ file: path.resolve(projectDictionary, '.gitignore'), template: 'gitignore.ejs' });
  files.push({ file: path.resolve(projectDictionary, 'package.json'), template: 'package.json.ejs', name: fields.name, modules: moduleVersions(modules) });
  files.push({ file: path.resolve(projectDictionary, 'README.md'), template: 'readme.md.ejs', name: fields.name });
  files.push({ file: path.resolve(projectDictionary, '.reinrc.json'), template: 'reinrc.json.ejs', fields });
  
  ctx.spinner.start();
  ctx.spinner.name = 'build';
  ctx.spinner.info('Loading ...');
  
  const templatePath = path.resolve(__dirname, '../template');
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const templateFile = path.resolve(templatePath, file.template);
    if (fs.existsSync(templateFile)) {
      let str = await renderFileSync(path.resolve(templatePath, file.template), file);
      if (['.js', '.json'].indexOf(path.extname(file.file)) > -1) {
        str = jsbeautifier.js_beautify(str, {
          indent_size: 2,
          space_in_empty_paren: true
        });
      }
      fs.outputFileSync(file.file, str);
      ctx.spinner.debug(file.file);
      await new Promise(resolve => setTimeout(() => resolve(), 50));
    }
  }
  
  if (!fields.setup) {
    return ctx.spinner.success(
      '项目创建成功，您需要手动安装依赖！',
      '\n',
      chalk.blue(`$> cd ${fields.name}`),
      '\n',
      chalk.magenta(`$> npm install`)
    );
  }
  
  ctx.spinner.info('正在检测可用模块源地址...');
  
  let registry = null;
  if (await Ping('npm.51.nb')) {
    registry = 'http://npm.51.nb';
  } else if (Ping('registry.npm.taobao.org')) {
    registry = 'https://registry.npm.taobao.org';
  } else {
    registry = 'http://registry.npmjs.com';
  }
  
  ctx.spinner.warn('正在安装依赖，请稍后...', '\n', 'Registry:', registry);
  // 自动安装依赖
  await execScript(projectDictionary, 'npm', 'install', '--save', '--registry=' + registry, ...modules);
  ctx.spinner.success(
    '项目创建成功！',
    '\n',
    chalk.blue(`$> cd ${fields.name}`),
    '\n',
    chalk.magenta(`$> npm run dev`)
  );
};

function moduleVersions(modules) {
  const res = {};
  modules.forEach(modal => {
    res[modal] = '^1.0.0';
  });
  return res;
}
