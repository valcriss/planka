/* eslint-disable no-underscore-dangle */

const lodash = require('lodash');
const makeTranslator = require('../api/helpers/utils/make-translator');

const originalSails = global.sails;
const originalLodash = global._;

describe('helpers/utils/make-translator', () => {
  beforeEach(() => {
    global._ = lodash;

    const i18n = {
      locale: 'en',
      setLocale(locale) {
        this.locale = locale;
      },
      __(value) {
        return `${this.locale}:${value}`;
      },
    };

    global.sails = {
      hooks: {
        i18n,
      },
      config: {
        i18n: {
          defaultLocale: 'en',
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

    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('returns translator for provided language', () => {
    const t = makeTranslator.fn({ language: 'fr' });

    expect(t('Hello')).toBe('fr:Hello');
  });

  test('returns translator for default language', () => {
    const t = makeTranslator.fn({});

    expect(t('Hello')).toBe('en:Hello');
  });
});
