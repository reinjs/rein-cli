const { encode } = require('@reinjs/rein-command/lib/argv');
const Router = require('ys-middleware-router');
module.exports = class PluginRouter extends Router {
  constructor(...args) {
    super(...args);
  }
  
  get commander() {
    return (this.url || '').replace(/\//g, ' ').replace(/^\s+/, '')
  }
  
  use(...args) {
    return this.use(encode(args[0]), ...args.slice(1));
  }
  
  param(...args) {
    return this.param(args[0], ...args.slice(1));
  }
  
  command(...args) {
    return this.get(encode(args[0]), ...args.slice(1));
  }
};