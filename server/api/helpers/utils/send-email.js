/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    to: {
      type: 'string',
      required: true,
    },
    subject: {
      type: 'string',
      required: true,
    },
    html: {
      type: 'string',
      required: true,
    },
    failSilently: {
      type: 'boolean',
      defaultsTo: true,
    },
  },

  async fn(inputs) {
    const { failSilently = true, ...message } = inputs;
    const transporter = sails.hooks.smtp.getTransporter();

    if (!transporter) {
      const error = new Error('SMTP transporter is not configured');
      error.code = 'E_SMTP_NOT_CONFIGURED';

      sails.log.error(`Error sending email: ${error}`);

      if (failSilently) {
        return null;
      }

      throw error;
    }

    try {
      const info = await transporter.sendMail({
        ...message,
        from: sails.config.custom.smtpFrom,
      });

      sails.log.info(`Email sent: ${info.messageId}`);

      return info;
    } catch (error) {
      sails.log.error(`Error sending email: ${error}`);

      if (failSilently) {
        return null;
      }

      throw error;
    }
  },
};
