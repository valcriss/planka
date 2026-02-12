const { POSITION_GAP } = require('../constants');
const { addPosition, removePosition } = require('../utils/migrations');

describe('migrations utils', () => {
  test('addPosition adds column/index, fills positions per parent and drops nullable flag', async () => {
    const records = [
      { id: 1, boardId: 10 },
      { id: 2, boardId: 10 },
      { id: 3, boardId: 20 },
    ];
    const updates = [];
    const schemaTables = [];
    const tableBuilders = [];

    const queryBuilder = {
      orderBy: jest.fn().mockResolvedValue(records),
      update: jest.fn((payload) => ({
        where: jest.fn(async (_field, id) => {
          updates.push({ id, position: payload.position });
        }),
      })),
    };

    const knex = jest.fn(() => queryBuilder);
    knex.schema = {
      table: jest.fn(async (tableName, callback) => {
        const table = {
          specificType: jest.fn(),
          index: jest.fn(),
          dropNullable: jest.fn(),
          dropColumn: jest.fn(),
        };

        schemaTables.push(tableName);
        tableBuilders.push(table);
        callback(table);
      }),
    };

    await addPosition(knex, 'cards', 'boardId');

    expect(knex.schema.table).toHaveBeenCalledTimes(2);
    expect(schemaTables).toEqual(['cards', 'cards']);
    expect(tableBuilders[0].specificType).toHaveBeenCalledWith('position', 'double precision');
    expect(tableBuilders[0].index).toHaveBeenCalledWith('position');
    expect(tableBuilders[1].dropNullable).toHaveBeenCalledWith('position');
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(['boardId', 'id']);
    expect(updates).toEqual([
      { id: 1, position: POSITION_GAP },
      { id: 2, position: POSITION_GAP * 2 },
      { id: 3, position: POSITION_GAP },
    ]);
  });

  test('removePosition drops the position column', async () => {
    const table = {
      dropColumn: jest.fn(),
    };
    const knex = {
      schema: {
        table: jest.fn(async (_tableName, callback) => callback(table)),
      },
    };

    await removePosition(knex, 'cards');

    expect(knex.schema.table).toHaveBeenCalledWith('cards', expect.any(Function));
    expect(table.dropColumn).toHaveBeenCalledWith('position');
  });
});
