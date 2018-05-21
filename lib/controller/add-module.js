const fs = require('fs-extra');
const path = require('path');
const { cname, createFiles } = require('../utils');

module.exports = async ctx => {
  const relativePath = path.relative(ctx.projectCwd, process.cwd());
  const name = ctx.params.name.replace(/^\//, '');
  const bname = name.replace(/[\/\-\.]+/, '_');
  
  // 插件支持
  for (const plugin in ctx.plugins) {
    const pluginExports = ctx.plugins[plugin];
    if (pluginExports.add) {
      const pluginReturn = await pluginExports.add(name, ctx.data);
      if (pluginReturn === true) return;
    }
  }

  if (ctx.data.agent) {
    const reinPath = path.resolve(ctx.projectCwd, '.reinrc.json');
    const agentTempString = JSON.stringify(ctx.projectCacheData, null, 2);
    const agents = ctx.projectCacheData.configs.agents = ctx.projectCacheData.configs.agents || [];
    const canAddAgent = agents.indexOf(name) === -1;
    if (!canAddAgent) throw new Error(`Agent['${name}']已存在`);
    ctx.spinner.start();
    ctx.spinner.name = 'agent';
    ctx.spinner.info('正在生成Agent相关文件...');
    ctx.projectCacheData.configs.agents.push(name);
    fs.outputFileSync(reinPath, JSON.stringify(ctx.projectCacheData, null, 2), 'utf8');
    ctx.dbo.on('beforeRollback', () => fs.outputFileSync(reinPath, agentTempString, 'utf8'));
    ctx.spinner.debug(reinPath);
    await createFiles(ctx, [
      { file: path.resolve(ctx.projectCwd, name + '.js'), template: 'agent.js.ejs' },
      { file: path.resolve(ctx.projectCwd, 'app', name + '.js'), template: 'app.agent.js.ejs' }
    ]);
    ctx.spinner.success('全部文件生成完毕');
    return;
  }
  
  if (!ctx.data.c && !ctx.data.m && !ctx.data.s) {
    throw new Error('请输入需要创建文件的类型(-c:<controller>, -m:<middleware>, -s:<service>, --agent:<agent>)');
  }
  
  let files = [];
  if (!relativePath) {
    if (ctx.data.c) files.push({
      file: path.resolve(ctx.projectCwd, 'app', 'controller', binkJsExt(name)),
      template: 'app.controller.js.ejs',
      cname: cname(bname, 'controller'),
      init: false
    });
    if (ctx.data.m) files.push({
      file: path.resolve(ctx.projectCwd, 'app', 'middleware', binkJsExt(name)),
      template: 'app.middleware.js.ejs'
    });
    if (ctx.data.s) files.push({
      file: path.resolve(ctx.projectCwd, 'app', 'service', binkJsExt(name)),
      template: 'app.service.js.ejs',
      cname: cname(bname, 'service'),
      init: false
    });
  } else {
    const isInController = relativePath.indexOf('app/controller') === 0;
    const isInMiddleware = relativePath.indexOf('app/middleware') === 0;
    const isInService = relativePath.indexOf('app/service') === 0;

    if (isInController) {
      if (!ctx.data.m && !ctx.data.s) {
        files.push({
          file: path.resolve(process.cwd(), binkJsExt(name)),
          template: 'app.controller.js.ejs',
          cname: cname(bname, 'controller'),
          init: false
        });
      } else {
        if (ctx.data.m) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'middleware', binkJsExt(name)),
          template: 'app.middleware.js.ejs'
        });
        if (ctx.data.s) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'service', binkJsExt(name)),
          template: 'app.service.js.ejs',
          cname: cname(bname, 'service'),
          init: false
        });
      }
    }
  
    if (isInMiddleware) {
      if (!ctx.data.c && !ctx.data.s) {
        files.push({
          file: path.resolve(process.cwd(), binkJsExt(name)),
          template: 'app.middleware.js.ejs'
        });
      } else {
        if (ctx.data.c) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'controller', binkJsExt(name)),
          template: 'app.controller.js.ejs',
          cname: cname(bname, 'controller'),
          init: false
        });
        if (ctx.data.s) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'service', binkJsExt(name)),
          template: 'app.service.js.ejs',
          cname: cname(bname, 'service'),
          init: false
        });
      }
    }
  
    if (isInService) {
      if (!ctx.data.c && !ctx.data.m) {
        files.push({
          file: path.resolve(process.cwd(), binkJsExt(name)),
          template: 'app.service.js.ejs',
          cname: cname(bname, 'service'),
          init: false
        });
      } else {
        if (ctx.data.c) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'controller', binkJsExt(name)),
          template: 'app.controller.js.ejs',
          cname: cname(bname, 'controller'),
          init: false
        });
        if (ctx.data.m) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'middleware', binkJsExt(name)),
          template: 'app.middleware.js.ejs'
        });
      }
    }
  }
  
  ctx.spinner.start();
  ctx.spinner.name = 'add';
  ctx.spinner.info('正在生成文件...');
  await createFiles(ctx, files);
  ctx.spinner.success('全部文件生成完毕');
};

function binkJsExt(name) {
  if (/\.js$/i.test(name)) return name;
  return name + '.js';
}