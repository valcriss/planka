const lodash = require('lodash');

jest.mock('knex', () => jest.fn());
const initKnex = require('knex');

const addColumnIfNotExists = require('../api/helpers/migrations/add-column-if-not-exists');

const originalLodash = global._;
describe('helpers/migrations/add-column-if-not-exists', () => {
  beforeEach(() => {
    global._ = lodash;
    initKnex.mockReset();
  });
  afterAll(() => {
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('adds column when missing and does not destroy provided knex', async () => {
    const knex = {
      schema: {
        hasColumn: jest.fn().mockResolvedValue(false),
        table: jest.fn().mockResolvedValue(),
      },
      destroy: jest.fn(),
    };
    const columnDefinition = jest.fn();
    await addColumnIfNotExists.fn({
      knex,
      tableName: 'cards',
      columnName: 'color',
      columnDefinition,
    });
    expect(knex.schema.hasColumn).toHaveBeenCalledWith('cards', 'color');
    expect(knex.schema.table).toHaveBeenCalledWith('cards', columnDefinition);
    expect(knex.destroy).not.toHaveBeenCalled();
  });
  test('skips adding when column exists and destroys created knex', async () => {
    const knex = {
      schema: {
        hasColumn: jest.fn().mockResolvedValue(true),
        table: jest.fn().mockResolvedValue(),
      },
      destroy: jest.fn().mockResolvedValue(),
    };
    initKnex.mockReturnValue(knex);
    await addColumnIfNotExists.fn({
      tableName: 'cards',
      columnName: 'color',
      columnDefinition: jest.fn(),
    });
    expect(knex.schema.table).not.toHaveBeenCalled();
    expect(knex.destroy).toHaveBeenCalled();
    expect(initKnex).toHaveBeenCalled();
  });
});
