/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import http from './http';

const testSmtp = (data, headers) => http.post('/system/test-smtp', data, headers);

export default {
  testSmtp,
};
