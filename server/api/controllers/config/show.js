/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser, currentSession } = this.req;

    const oidcClient = await sails.hooks.oidc.getClient();

    let oidc = null;
    if (oidcClient) {
      const authorizationUrlParams = {
        scope: sails.config.custom.oidcScopes,
      };

      if (!sails.config.custom.oidcUseDefaultResponseMode) {
        authorizationUrlParams.response_mode = sails.config.custom.oidcResponseMode;
      }

      oidc = {
        authorizationUrl: oidcClient.authorizationUrl(authorizationUrlParams),
        endSessionUrl: oidcClient.issuer.end_session_endpoint
          ? oidcClient.endSessionUrl({
              post_logout_redirect_uri: `${sails.config.custom.baseUrl}/login`,
              ...(currentSession && currentSession.oidcIdToken
                ? { id_token_hint: currentSession.oidcIdToken }
                : {}),
            })
          : null,
        isEnforced: sails.config.custom.oidcEnforced,
      };
    }

    return {
      item: sails.helpers.config.presentOne(
        {
          oidc,
        },
        currentUser,
      ),
    };
  },
};
