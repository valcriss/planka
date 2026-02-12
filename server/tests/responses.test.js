const badGateway = require('../api/responses/badGateway');
const badRequest = require('../api/responses/badRequest');
const conflict = require('../api/responses/conflict');
const forbidden = require('../api/responses/forbidden');
const notFound = require('../api/responses/notFound');
const unauthorized = require('../api/responses/unauthorized');
const unprocessableEntity = require('../api/responses/unprocessableEntity');

const createRes = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockReturnValue(res);

  return res;
};

describe('api responses', () => {
  test('badRequest normalizes string payload', () => {
    const res = createRes();

    badRequest.call({ res }, 'Missing input');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_BAD_REQUEST',
      message: 'Missing input',
    });
  });

  test('badRequest passes object payload', () => {
    const res = createRes();

    badRequest.call({ res }, { message: 'Invalid', details: { field: 'name' } });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_BAD_REQUEST',
      message: 'Invalid',
      details: { field: 'name' },
    });
  });

  test('badGateway normalizes string payload', () => {
    const res = createRes();

    badGateway.call({ res }, 'Upstream failed');

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_BAD_GATEWAY',
      message: 'Upstream failed',
    });
  });

  test('badGateway passes object payload', () => {
    const res = createRes();

    badGateway.call({ res }, { message: 'Proxy error', retryAfter: 10 });

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_BAD_GATEWAY',
      message: 'Proxy error',
      retryAfter: 10,
    });
  });

  test('unauthorized returns code and message', () => {
    const res = createRes();

    unauthorized.call({ res }, 'Auth required');

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_UNAUTHORIZED',
      message: 'Auth required',
    });
  });

  test('forbidden returns code and message', () => {
    const res = createRes();

    forbidden.call({ res }, 'No access');

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_FORBIDDEN',
      message: 'No access',
    });
  });

  test('conflict returns code and message', () => {
    const res = createRes();

    conflict.call({ res }, 'Already exists');

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_CONFLICT',
      message: 'Already exists',
    });
  });

  test('notFound returns code and message', () => {
    const res = createRes();

    notFound.call({ res }, 'Not found');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_NOT_FOUND',
      message: 'Not found',
    });
  });

  test('unprocessableEntity returns code and message', () => {
    const res = createRes();

    unprocessableEntity.call({ res }, 'Invalid data');

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      code: 'E_UNPROCESSABLE_ENTITY',
      message: 'Invalid data',
    });
  });
});
