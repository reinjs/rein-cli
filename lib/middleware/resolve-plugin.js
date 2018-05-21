const Plugin = require('../plugin');
module.exports = async (ctx, next) => {
  const router = new Plugin();
  for (const plugin in ctx.plugins) {
    const pluginExports = ctx.plugins[plugin];
    if (pluginExports.command) {
      await pluginExports.command(router);
    }
  }
  const middleware = router.routes();
  await middleware(ctx, next);
};