const Spinner = require('ys-spinner');
module.exports = async (ctx, next) => {
  ctx.spinner = new Spinner();
  ctx.spinner.close = async () => {
    await new Promise(resolve => setTimeout(resolve, 51));
    ctx.spinner.stop();
  };
  await next();
};