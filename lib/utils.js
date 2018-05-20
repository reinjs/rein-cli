const fs = require('fs-extra');
const ejs = require('ejs');
const path = require('path');
const ping = require('ping');
const { spawn } = require('child_process');
const jsbeautifier = require('js-beautify');

exports.execScript = function(cwd, cmd, ...args) {
  return new Promise((resolve, reject) => {
    let err = '';
    const ls = spawn(cmd, args, {
      silent: true,
      cwd
    });
    ls.stderr.on('data', data => err += data)
    ls.on('exit', (code, signal) => {
      if (code === 0) {
        return resolve();
      }
      reject(new Error(err || 'command run error'));
    });
  });
};

exports.cname = function(name, type) {
  const property = type ? name + '_' + type : name;
  return property.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
};

exports.renderFileSync = renderFileSync;
function renderFileSync(filename, data) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(filename, data, (err, str) => {
      if (err) return reject(err);
      resolve(str);
    });
  });
}

exports.Ping = Ping;
function Ping(host) {
  return new Promise(resolve => ping.sys.probe(host, resolve));
}

exports.createFiles = async function(ctx, files) {
  const templatePath = path.resolve(__dirname, './template');
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
};
