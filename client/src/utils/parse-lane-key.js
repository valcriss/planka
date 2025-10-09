/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const parseLaneKey = (laneKey) => {
  if (!laneKey) {
    return null;
  }

  const [type = null, ...rest] = laneKey.split(':');
  const id = rest.length > 0 ? rest.join(':') : null;

  return {
    key: laneKey,
    type,
    id,
  };
};

export default parseLaneKey;
