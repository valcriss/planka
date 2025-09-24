/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * badGateway.js
 *
 * A custom response.
 *
 * Example usage:
 * ```
 *     return res.badGateway();
 *     // -or-
 *     return res.badGateway(optionalData);
 * ```
 *
 * Or with actions2:
 * ```
 *     exits: {
 *       somethingHappened: {
 *         responseType: 'badGateway'
 *       }
 *     }
 * ```
 *
 * ```
 *     throw 'somethingHappened';
 *     // -or-
 *     throw { somethingHappened: optionalData }
 * ```
 */

const normalizePayload = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }

  return { message: payload };
};

module.exports = function badGateway(payload) {
  const { res } = this;

  return res.status(502).json({
    code: 'E_BAD_GATEWAY',
    ...normalizePayload(payload),
  });
};
