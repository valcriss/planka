const originalSails = global.sails;

const createSails = () => ({
  config: {
    environment: 'test',
    custom: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpName: 'Example SMTP',
      smtpUser: 'smtp-user',
      smtpFrom: 'Planka <noreply@example.com>',
      smtpTlsRejectUnauthorized: true,
    },
  },
  hooks: {
    smtp: {
      isEnabled: jest.fn().mockReturnValue(true),
    },
  },
  helpers: {
    utils: {
      sendEmail: {
        with: jest.fn(),
      },
    },
  },
});

const controller = require('../api/controllers/system/test-smtp');

describe('system/test-smtp controller', () => {
  beforeEach(() => {
    global.sails = createSails();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
  });

  test('throws when SMTP is not configured', async () => {
    sails.config.custom.smtpHost = null;
    sails.config.custom.smtpPort = null;
    sails.config.custom.smtpSecure = null;
    sails.config.custom.smtpName = null;
    sails.config.custom.smtpUser = null;
    sails.config.custom.smtpFrom = null;
    sails.config.custom.smtpTlsRejectUnauthorized = null;

    sails.hooks.smtp.isEnabled.mockReturnValue(false);

    await expect(
      controller.fn.call({ req: {} }, { email: 'admin@example.com' }),
    ).rejects.toMatchObject({
      smtpNotConfigured: {
        message: 'SMTP is not configured',
        smtp: {},
      },
    });
  });

  test('returns delivery information on success', async () => {
    const deliveryInfo = {
      messageId: 'test-id',
      accepted: ['admin@example.com'],
      rejected: [],
      response: '250 OK',
    };

    sails.helpers.utils.sendEmail.with.mockResolvedValue(deliveryInfo);

    const result = await controller.fn.call({ req: {} }, { email: 'admin@example.com' });

    expect(sails.helpers.utils.sendEmail.with).toHaveBeenCalledWith({
      to: 'admin@example.com',
      subject: 'Planka SMTP configuration test',
      html: expect.stringContaining('This is a test e-mail sent by Planka'),
      failSilently: false,
    });

    expect(result.item).toMatchObject({
      to: 'admin@example.com',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        name: 'Example SMTP',
        user: 'smtp-user',
        from: 'Planka <noreply@example.com>',
        tlsRejectUnauthorized: true,
      },
      delivery: deliveryInfo,
    });
    expect(result.item.timestamp).toBeDefined();
  });

  test('returns detailed information when sendEmail fails', async () => {
    const transportError = new Error('SMTP failure');
    transportError.code = 'ESMTP';
    transportError.responseCode = 535;

    sails.helpers.utils.sendEmail.with.mockRejectedValue(transportError);

    await expect(
      controller.fn.call({ req: {} }, { email: 'admin@example.com' }),
    ).rejects.toMatchObject({
      smtpSendFailed: {
        message: 'Failed to send SMTP test email',
        to: 'admin@example.com',
        smtp: {
          host: 'smtp.example.com',
          port: 587,
        },
        error: {
          message: 'SMTP failure',
          code: 'ESMTP',
          responseCode: 535,
        },
      },
    });
  });
});
