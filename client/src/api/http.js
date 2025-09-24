/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from '../constants/Config';

const http = {};

const buildFormData = (data) => {
  if (!data) {
    return undefined;
  }

  return Object.keys(data).reduce((result, key) => {
    result.append(key, data[key]);

    return result;
  }, new FormData());
};

const createResponseError = (response, text = '', parseError = null, requestInfo = {}) => {
  const trimmedText = text.trim();
  const isHtml = trimmedText.startsWith('<');
  const { status, statusText } = response;
  const { method: requestMethod, url: requestUrl } = requestInfo;

  let message = statusText || 'Unexpected server response.';

  if (trimmedText && !isHtml) {
    message = trimmedText;
  } else if (!statusText && status) {
    message = `HTTP ${status}`;
  }

  const error = new Error(message);

  if (status) {
    error.status = status;
  }

  if (statusText) {
    error.statusText = statusText;
  }

  if (trimmedText && (isHtml || trimmedText !== message)) {
    error.body = trimmedText;
  }

  if (parseError) {
    error.parseError = parseError.message;
  }

  if (requestMethod) {
    error.method = requestMethod;
  }

  if (requestUrl) {
    error.url = requestUrl;
  }

  return error;
};

// TODO: add all methods
['GET', 'POST', 'DELETE'].forEach((method) => {
  http[method.toLowerCase()] = async (url, data, headers) => {
    const formData = buildFormData(data);
    const requestOptions = {
      method,
      headers,
      credentials: 'include',
    };

    if (formData !== undefined) {
      requestOptions.body = formData;
    }

    const response = await fetch(`${Config.SERVER_BASE_URL}/api${url}`, requestOptions);
    const text = await response.text();

    let body = null;
    let parseError = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        parseError = error;

        if (response.ok) {
          const invalidResponseError = new Error('Unable to parse server response.');
          invalidResponseError.originalError = error;
          invalidResponseError.responseText = text;
          invalidResponseError.status = response.status;
          invalidResponseError.statusText = response.statusText;
          invalidResponseError.method = method;
          invalidResponseError.url = url;

          throw invalidResponseError;
        }
      }
    }

    if (!response.ok) {
      if (body !== null && body !== undefined) {
        if (typeof body === 'object') {
          const error = new Error(body.message || 'Request failed.');
          Object.assign(error, body);

          throw error;
        }

        throw createResponseError(response, String(body), parseError, { method, url });
      }

      throw createResponseError(response, text, parseError, { method, url });
    }

    return body;
  };
});

export default http;
