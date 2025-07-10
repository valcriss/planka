const constants = require('../constants');

describe('constants', () => {
  test('POSITION_GAP value', () => {
    expect(constants.POSITION_GAP).toBe(65536);
  });

  test('MAX_SIZE_IN_BYTES_TO_GET_ENCODING value', () => {
    expect(constants.MAX_SIZE_IN_BYTES_TO_GET_ENCODING).toBe(8 * 1024 * 1024);
  });
});
