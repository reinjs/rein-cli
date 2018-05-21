const fs = require('fs');
const path = require('path');
const findRoot = require('find-root');
const utils = require('@reinjs/rein-utils');

module.exports = async (ctx, next) => {
  const res = find(process.cwd());
  if (!res) throw new Error('该项目不是`reinjs`项目，无法操作！');
  ctx.projectCacheData = res.rc;
  ctx.projectCwd = res.cwd;
  ctx.projectIsPlugin = res.isPlugin;
  await next();
};

function find(cwd) {
  const closestPackageFile = findRoot(cwd);
  if (!closestPackageFile) return;
  const reinrcFile = path.resolve(closestPackageFile, '.reinrc.json');
  if (fs.existsSync(reinrcFile)) return { rc: utils.loadFile(reinrcFile), cwd: closestPackageFile, isPlugin: false };
  const packageFile = path.resolve(closestPackageFile, 'package.json');
  if (fs.existsSync(packageFile)) {
    const content = utils.loadFile(packageFile);
    if (content.plugin && content.plugin.name) {
      return { rc: content, cwd: closestPackageFile, isPlugin: true };
    }
  }
}