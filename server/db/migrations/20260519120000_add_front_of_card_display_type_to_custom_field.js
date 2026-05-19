exports.up = (knex) =>
  knex.schema.table('custom_field', (table) => {
    table.text('front_of_card_display_type').notNullable().defaultTo('normal');
  });

exports.down = (knex) =>
  knex.schema.table('custom_field', (table) => {
    table.dropColumn('front_of_card_display_type');
  });
