const _ = require('lodash');

const originalSails = global.sails;
const originalUnderscore = global._;
const makeTranslatorHelper = require('../api/helpers/utils/make-translator');

describe('utils/make-translator helper', () => {
  beforeEach(() => {
    global._ = _;
    global.sails = {
      hooks: {
        i18n: {
          locale: 'en',
          setLocale(locale) {
            this.locale = locale;
          },
          // eslint-disable-next-line no-underscore-dangle
          __(key) {
            return `${this.locale}:${key}`;
          },
        },
      },
      config: {
        i18n: {
          defaultLocale: 'en-US',
        },
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalUnderscore === 'undefined') {
      delete global._;
    } else {
      global._ = originalUnderscore;
    }
  });

  test('returns translator bound to provided language', () => {
    const translate = makeTranslatorHelper.fn({
      language: 'fr-FR',
    });

    expect(translate('hello')).toBe('fr-FR:hello');
  });

  test('falls back to default locale when language is empty', () => {
    const translate = makeTranslatorHelper.fn({
      language: null,
    });

    expect(translate('hello')).toBe('en-US:hello');
  });
});
