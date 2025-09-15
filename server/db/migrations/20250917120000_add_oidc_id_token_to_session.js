exports.up = async (knex) => {
  await knex.schema.table('session', (table) => {
    table.text('oidc_id_token');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('session', (table) => {
    table.dropColumn('oidc_id_token');
  });
};
