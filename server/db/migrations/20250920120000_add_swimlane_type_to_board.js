exports.up = async (knex) => {
  await knex.schema.table('board', (table) => {
    table.string('swimlane_type').notNullable().defaultTo('none');
  });

  await knex('board').update({ swimlane_type: 'none' });
};

exports.down = async (knex) => {
  await knex('board').update({ swimlane_type: 'none' });

  await knex.schema.table('board', (table) => {
    table.dropColumn('swimlane_type');
  });
};
