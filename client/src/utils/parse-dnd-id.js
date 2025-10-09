/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export default (dndId) => {
  if (!dndId) {
    return { type: null, id: null, laneKey: null };
  }

  const [type = null, id = null, ...rest] = dndId.split(':');

  let laneKey = null;
  if (rest.length > 0) {
    const laneIndex = rest.indexOf('lane');

    if (laneIndex !== -1) {
      laneKey = rest.slice(laneIndex + 1).join(':') || null;
    }
  }

  return {
    type,
    id,
    laneKey,
  };
};
