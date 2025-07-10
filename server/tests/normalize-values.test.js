const _ = require('lodash');
global._ = _;
const normalizeValues = require('../utils/normalize-values');

describe('normalizeValues', () => {
  test('applies setTo and defaultTo correctly', () => {
    const rules = {
      name: { setTo: (values) => values.name.toUpperCase() },
      age: { defaultTo: 30 },
      role: { defaultTo: (values) => (values.isAdmin ? 'admin' : 'user') },
    };

    const values = { name: 'john', isAdmin: true };
    const record = { age: 25 };

    const result = normalizeValues(rules, values, record);

    expect(result).toEqual({ name: 'JOHN', role: 'admin' });
  });
});
