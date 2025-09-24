/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * badRequest.js
 *
 * A custom response.
 *
 * Example usage:
 * ```
 *     return res.badRequest();
 *     // -or-
 *     return res.badRequest(optionalData);
 * ```
 *
 * Or with actions2:
 * ```
 *     exits: {
 *       somethingHappened: {
 *         responseType: 'badRequest'
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

module.exports = function badRequest(payload) {
  const { res } = this;

  return res.status(400).json({
    code: 'E_BAD_REQUEST',
    ...normalizePayload(payload),
  });
};
