const showController = require('../api/controllers/config/show');

const originalSails = global.sails;

describe('config controllers', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          oidcScopes: 'openid profile',
          oidcUseDefaultResponseMode: false,
          oidcResponseMode: 'query',
          oidcEnforced: true,
          baseUrl: 'https://app.example.com',
        },
      },
      hooks: {
        oidc: {
          getClient: jest.fn(),
        },
      },
      helpers: {
        config: {
          presentOne: jest.fn((config) => config),
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
  });

  test('config/show returns null oidc when client missing', async () => {
    sails.hooks.oidc.getClient.mockResolvedValue(null);

    const result = await showController.fn.call({ req: { currentUser: { id: 'u1' } } });

    expect(result).toEqual({
      item: {
        oidc: null,
      },
    });
  });

  test('config/show builds oidc urls when client exists', async () => {
    const authorizationUrl = jest.fn(() => 'https://issuer/authorize');
    const endSessionUrl = jest.fn(() => 'https://issuer/logout');

    sails.hooks.oidc.getClient.mockResolvedValue({
      authorizationUrl,
      endSessionUrl,
      issuer: {
        end_session_endpoint: 'https://issuer/logout',
      },
    });

    const result = await showController.fn.call({
      req: {
        currentUser: { id: 'u1' },
        currentSession: { oidcIdToken: 'id-token' },
      },
    });

    expect(authorizationUrl).toHaveBeenCalledWith({
      scope: 'openid profile',
      response_mode: 'query',
    });
    expect(endSessionUrl).toHaveBeenCalledWith({
      post_logout_redirect_uri: 'https://app.example.com/login',
      id_token_hint: 'id-token',
    });
    expect(result).toEqual({
      item: {
        oidc: {
          authorizationUrl: 'https://issuer/authorize',
          endSessionUrl: 'https://issuer/logout',
          isEnforced: true,
        },
      },
    });
  });
});
