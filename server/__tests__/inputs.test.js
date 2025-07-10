const { idInput, idsInput } = require('../utils/inputs');
const { MAX_STRING_ID } = require('../utils/validators');

describe('inputs', () => {
  test('idInput schema', () => {
    expect(idInput).toEqual(
      expect.objectContaining({
        type: 'string',
        maxLength: MAX_STRING_ID.length,
        regex: expect.any(RegExp),
        custom: expect.any(Function),
      }),
    );
  });

  test('idsInput schema', () => {
    expect(idsInput).toEqual(
      expect.objectContaining({
        type: 'string',
        maxLength: expect.any(Number),
        regex: expect.any(RegExp),
        custom: expect.any(Function),
      }),
    );
  });
});
