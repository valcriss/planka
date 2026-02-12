describe('event-helpers', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('uses metaKey on Mac', () => {
    jest.doMock('../src/constants/Config', () => ({
      __esModule: true,
      default: {
        IS_MAC: true,
      },
    }));

    // eslint-disable-next-line global-require
    const { isModifierKeyPressed } = require('../src/utils/event-helpers');

    expect(isModifierKeyPressed({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isModifierKeyPressed({ metaKey: false, ctrlKey: true })).toBe(false);
  });

  test('uses ctrlKey on non-Mac', () => {
    jest.doMock('../src/constants/Config', () => ({
      __esModule: true,
      default: {
        IS_MAC: false,
      },
    }));

    // eslint-disable-next-line global-require
    const { isModifierKeyPressed } = require('../src/utils/event-helpers');

    expect(isModifierKeyPressed({ metaKey: true, ctrlKey: false })).toBe(false);
    expect(isModifierKeyPressed({ metaKey: false, ctrlKey: true })).toBe(true);
  });
});
