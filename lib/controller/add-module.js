const fs = require('fs-extra');
const path = require('path');
const jsbeautifier = require('js-beautify');
const { cname, renderFileSync } = require('../utils');

module.exports = async ctx => {
  const relativePath = path.relative(ctx.projectCwd, process.cwd());
  const name = ctx.params.name.replace(/^\//, '');
  if (!relativePath && !ctx.data.c && !ctx.data.m && !ctx.data.s && !ctx.data.a) {
    throw new Error('请输入需要创建文件的类型(-c:<controller>, -m:<middleware>, -s:<service>, -a:<agent>)');
  }
  
  let files = [];
  if (!relativePath) {
    if (ctx.data.c) files.push({
      file: path.resolve(ctx.projectCwd, 'app', 'controller', binkJsExt(name)),
      template: 'app.controller.js.ejs',
      cname: cname(name, 'controller')
    });
    if (ctx.data.m) files.push({
      file: path.resolve(ctx.projectCwd, 'app', 'middleware', binkJsExt(name)),
      template: 'app.middleware.js.ejs'
    });
    if (ctx.data.s) files.push({
      file: path.resolve(ctx.projectCwd, 'app', 'service', binkJsExt(name)),
      template: 'app.service.js.ejs',
      cname: cname(name, 'service')
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
          cname: cname(name, 'controller'),
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
          cname: cname(name, 'service'),
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
          cname: cname(name, 'controller'),
          init: false
        });
        if (ctx.data.s) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'service', binkJsExt(name)),
          template: 'app.service.js.ejs',
          cname: cname(name, 'service'),
          init: false
        });
      }
    }
  
    if (isInService) {
      if (!ctx.data.c && !ctx.data.m) {
        files.push({
          file: path.resolve(process.cwd(), binkJsExt(name)),
          template: 'app.service.js.ejs',
          cname: cname(name, 'service'),
          init: false
        });
      } else {
        if (ctx.data.c) files.push({
          file: path.resolve(ctx.projectCwd, 'app', 'controller', binkJsExt(name)),
          template: 'app.controller.js.ejs',
          cname: cname(name, 'controller'),
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
      if (fs.existsSync(file.file)) continue;
      fs.outputFileSync(file.file, str);
      ctx.dbo.on('beforeRollback', () => fs.removeSync(file.file));
      ctx.spinner.debug(file.file);
      await new Promise(resolve => setTimeout(() => resolve(), 50));
    }
  }
  ctx.spinner.success('全部文件生成完毕');
};

function binkJsExt(name) {
  if (/\.js$/i.test(name)) return name;
  return name + '.js';
}