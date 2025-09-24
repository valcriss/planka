/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const pickDefined = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null),
  );

const buildSmtpDetails = () =>
  pickDefined({
    host: sails.config.custom.smtpHost,
    port: sails.config.custom.smtpPort,
    secure: sails.config.custom.smtpSecure,
    name: sails.config.custom.smtpName,
    user: sails.config.custom.smtpUser,
    from: sails.config.custom.smtpFrom,
    tlsRejectUnauthorized: sails.config.custom.smtpTlsRejectUnauthorized,
  });

const sanitizeError = (error) => {
  if (!error) {
    return null;
  }

  return pickDefined({
    message: error.message,
    code: error.code,
    command: error.command,
    response: error.response,
    responseCode: error.responseCode,
    stack: sails.config.environment === 'production' ? undefined : error.stack,
  });
};

const createSmtpNotConfiguredError = (timestamp, smtp) => ({
  smtpNotConfigured: {
    message: 'SMTP is not configured',
    timestamp,
    smtp,
  },
});

const createSmtpSendFailedError = (error, to, timestamp, smtp) => ({
  smtpSendFailed: {
    message: 'Failed to send SMTP test email',
    to,
    timestamp,
    smtp,
    error: sanitizeError(error),
  },
});

const createDeliveryDetails = (info = {}) =>
  pickDefined({
    messageId: info.messageId,
    envelope: info.envelope,
    accepted: info.accepted,
    rejected: info.rejected,
    pending: info.pending,
    response: info.response,
  });

module.exports = {
  inputs: {
    email: {
      type: 'string',
      maxLength: 256,
      isEmail: true,
      required: true,
    },
  },

  exits: {
    smtpNotConfigured: {
      responseType: 'badRequest',
    },
    smtpSendFailed: {
      responseType: 'badGateway',
    },
  },

  async fn(inputs) {
    const timestamp = new Date().toISOString();
    const smtp = buildSmtpDetails();

    if (!sails.hooks.smtp.isEnabled()) {
      throw createSmtpNotConfiguredError(timestamp, smtp);
    }

    const html =
      `<p>This is a test e-mail sent by Planka to verify the configured SMTP settings.</p>` +
      `<p>Timestamp: ${timestamp}</p>${smtp.host ? `<p>SMTP host: ${smtp.host}</p>` : ''}`;

    try {
      const info = await sails.helpers.utils.sendEmail.with({
        to: inputs.email,
        subject: 'Planka SMTP configuration test',
        html,
        failSilently: false,
      });

      return {
        item: {
          to: inputs.email,
          timestamp,
          smtp,
          delivery: createDeliveryDetails(info),
        },
      };
    } catch (error) {
      throw createSmtpSendFailedError(error, inputs.email, timestamp, smtp);
    }
  },
};
