// Generic test utilities for controller unit tests without spinning up full Sails.

/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */

const ensureLodash = () => {
  if (!global._) {
    // Lazily require lodash (project already depends on lodash globally in runtime)
    global._ = require('lodash');
  }
};

function mockSailsBase() {
  ensureLodash();
  global.sails = global.sails || {};
  global.sails.helpers = global.sails.helpers || {};
  global.sails.log = global.sails.log || {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return global.sails;
}

function defineHelper(pathSegments, impl) {
  let cursor = global.sails.helpers;
  for (let i = 0; i < pathSegments.length - 1; i += 1) {
    const seg = pathSegments[i];
    cursor[seg] = cursor[seg] || {};
    cursor = cursor[seg];
  }
  cursor[pathSegments[pathSegments.length - 1]] = impl;
}

// Build a chain object that mimics helper.with().intercept(...). Useful for intercept testing.
function buildInterceptChain({ value, errorCode }) {
  const chain = {
    _errorCode: errorCode || null,
    _mapped: null,
    with() {
      return this;
    },
    intercept(code, handler) {
      if (this._errorCode === code) {
        this._mapped = handler();
      }
      return this;
    },
    then(resolve, reject) {
      if (this._mapped) {
        return reject(this._mapped);
      }
      return resolve(value);
    },
    catch() {
      return this; // Simplistic; tests usually await directly.
    },
  };
  return chain;
}

function mockModel(name, methods) {
  const container = {};
  methods.forEach((m) => {
    container[m] = jest.fn();
  });
  global[name] = {
    qm: container,
  };
  return container;
}

function makeContext({ user = {}, reqExtra = {} } = {}) {
  return {
    req: {
      currentUser: {
        id: user.id || 'user-1',
        role: user.role || 'member',
        language: user.language || 'en',
      },
      getLocale: jest.fn().mockReturnValue('en'),
      ...reqExtra,
    },
  };
}

async function callController(controller, { inputs, user, reqExtra } = {}) {
  const ctx = makeContext({ user, reqExtra });
  return controller.fn.call(ctx, inputs || {});
}

// Creates or extends global membership related models with jest mocks.
function ensureMembershipGlobals() {
  global.BoardMembership = global.BoardMembership || {
    Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
    qm: { getOneByBoardIdAndUserId: jest.fn() },
  };
  global.CardMembership = global.CardMembership || {
    qm: { getOneByCardIdAndUserId: jest.fn() },
  };
  global.User = global.User || {
    qm: { getOneById: jest.fn() },
    Roles: {},
  };
  return {
    boardMembership: global.BoardMembership.qm.getOneByBoardIdAndUserId,
    cardMembership: global.CardMembership.qm.getOneByCardIdAndUserId,
    userGetOne: global.User.qm.getOneById,
  };
}

// Define a helper path that always returns an intercept-capable chain for path lookups.
function definePathHelper(pathSegments, payload, errorMap = {}) {
  defineHelper(pathSegments, (id) => ({
    intercept(code, handler) {
      if (code in errorMap) {
        // trigger mapped error by throwing handler result if errorMap condition matches
        if (errorMap[code](id, payload)) {
          throw handler();
        }
      }
      return payload;
    },
  }));
}

// Utility to reset provided jest mocks easily
function resetMocks(...fns) {
  fns.filter(Boolean).forEach((fn) => fn.mockReset());
}

module.exports = {
  mockSailsBase,
  defineHelper,
  buildInterceptChain,
  mockModel,
  callController,
  makeContext,
  ensureMembershipGlobals,
  definePathHelper,
  resetMocks,
};
