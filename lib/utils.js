const {
  spawn
} = require('child_process');

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