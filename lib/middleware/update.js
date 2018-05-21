const fs = require('fs');
const path = require('path');
const utils = require('@reinjs/rein-utils');
const request = require('request');
const { Registry, execScript } = require('../utils');
const pkg = require('../../package.json');
const compare = require('node-version-compare');
const chalk = require('chalk');

module.exports = async (ctx, next) => {
  const reinrcPath = path.resolve(process.env.HOME, '.commonrc.json');
  const commonRc = {
    rein: {
      updateTimeStamp: Date.now()
    }
  };
  if (!fs.existsSync(reinrcPath)) {
    fs.writeFileSync(reinrcPath, JSON.stringify(commonRc, null, 2), 'utf8');
  } else {
    commonRc.rein = utils.loadFile(reinrcPath).rein;
  }
  
  ctx.spinner.start();
  ctx.spinner.name = 'updating';
  ctx.spinner.info('检测版本升级...');
  
  let close = true;
  
  if (Date.now() - commonRc.rein.updateTimeStamp > 4 * 60 * 60 * 1000) {
    ctx.spinner.info('正在检测可用模块源地址...');
    const registry = await Registry();
    ctx.spinner.info('正在获取NPM仓库版本信息...', '\n', 'Registry:', registry);
    const value = await new Promise((resolve, reject) => {
      request(`${registry}/${pkg.name}`, (error, response, body) => {
        if (error) return reject(error);
        const version = JSON.parse(body)['dist-tags'].latest;
        resolve({
          v: compare(pkg.version, version),
          version
        });
      });
    });
    
    if (value.v === -1) {
      ctx.spinner.warn(
        '检测到版本变化...', '\n',
        '正在升级版本', chalk.yellow(pkg.version), '->', chalk.red(value.version)
      );
      // console.log('npm', 'i', '-g', pkg.name + '@' + value.version, '--registry=' + registry)
      await execScript(process.cwd(), 'npm', 'i', '-g', pkg.name + '@' + value.version, '--registry=' + registry);
      ctx.spinner.name = 'updated';
      ctx.spinner.success('+', pkg.name + '@' + value.version, '\n', '$>', chalk.bold(chalk.magenta('rc ' + ctx.commander)), 'continue....', 'please run this commander again.');
      close = false;
    }
  }
  commonRc.rein.updateTimeStamp = Date.now();
  fs.writeFileSync(reinrcPath, JSON.stringify(commonRc, null, 2), 'utf8');
  ctx.spinner.close(close);
  await new Promise(resolve => setTimeout(resolve, 51));
  if (close) await next();
};