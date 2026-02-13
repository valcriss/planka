const lodash = require('lodash');
const isFiniteList = require('../api/helpers/lists/is-finite');
const isArchiveOrTrash = require('../api/helpers/lists/is-archive-or-trash');
const makeName = require('../api/helpers/lists/make-name');

const originalList = global.List;
const originalLodash = global._;
describe('helpers/lists simple helpers', () => {
  beforeEach(() => {
    global._ = lodash;
    global.List = {
      FINITE_TYPES: ['finite'],
      Types: {
        ARCHIVE: 'archive',
        TRASH: 'trash',
      },
    };
  });
  afterAll(() => {
    if (typeof originalList === 'undefined') {
      delete global.List;
    } else {
      global.List = originalList;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('detects finite list types', () => {
    expect(isFiniteList.fn({ record: { type: 'finite' } })).toBe(true);
    expect(isFiniteList.fn({ record: { type: 'open' } })).toBe(false);
  });
  test('detects archive or trash', () => {
    expect(isArchiveOrTrash.fn({ record: { type: 'archive' } })).toBe(true);
    expect(isArchiveOrTrash.fn({ record: { type: 'trash' } })).toBe(true);
    expect(isArchiveOrTrash.fn({ record: { type: 'open' } })).toBe(false);
  });
  test('builds list name from record', () => {
    expect(makeName.fn({ record: { name: 'Custom', type: 'open' } })).toBe('Custom');
    expect(makeName.fn({ record: { type: 'archive' } })).toBe('Archive');
  });
});
