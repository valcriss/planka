module.exports = {
  async fn() {
    const baseCardTypes = await BaseCardType.qm.getAll();
    return { items: baseCardTypes };
  },
};
