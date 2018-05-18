module.exports = async function() {
  if (this.spinner) {
    await this.spinner.close();
  }
};