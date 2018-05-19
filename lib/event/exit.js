module.exports = app => {
  return async () => {
    if (app.spinner) {
      await app.spinner.close();
    }
  };
};