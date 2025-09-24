const originalSails = global.sails;

const createSails = () => ({
  config: {
    custom: {
      smtpFrom: 'Planka <noreply@example.com>',
    },
  },
  hooks: {
    smtp: {
      getTransporter: jest.fn(),
    },
  },
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
});

const sendEmailHelper = require('../api/helpers/utils/send-email');

describe('utils/send-email helper', () => {
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

  test('sends an e-mail when transporter is available', async () => {
    const transporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'abc',
        accepted: ['user@example.com'],
      }),
    };

    sails.hooks.smtp.getTransporter.mockReturnValue(transporter);

    const info = await sendEmailHelper.fn.call(
      {},
      {
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Hello</p>',
      },
    );

    expect(transporter.sendMail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Hello</p>',
      from: 'Planka <noreply@example.com>',
    });
    expect(info).toEqual({
      messageId: 'abc',
      accepted: ['user@example.com'],
    });
    expect(sails.log.info).toHaveBeenCalledWith('Email sent: abc');
  });

  test('returns null and logs when transporter is missing and failSilently is true', async () => {
    sails.hooks.smtp.getTransporter.mockReturnValue(null);

    const result = await sendEmailHelper.fn.call(
      {},
      {
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Hello</p>',
      },
    );

    expect(result).toBeNull();
    expect(sails.log.error).toHaveBeenCalledWith(
      expect.stringContaining('SMTP transporter is not configured'),
    );
  });

  test('throws when transporter is missing and failSilently is false', async () => {
    sails.hooks.smtp.getTransporter.mockReturnValue(null);

    await expect(
      sendEmailHelper.fn.call(
        {},
        {
          to: 'user@example.com',
          subject: 'Subject',
          html: '<p>Hello</p>',
          failSilently: false,
        },
      ),
    ).rejects.toMatchObject({
      message: 'SMTP transporter is not configured',
      code: 'E_SMTP_NOT_CONFIGURED',
    });
  });

  test('throws original error when sendMail fails and failSilently is false', async () => {
    const transportError = new Error('SMTP error');
    transportError.code = 'ESMTP';

    const transporter = {
      sendMail: jest.fn().mockRejectedValue(transportError),
    };

    sails.hooks.smtp.getTransporter.mockReturnValue(transporter);

    await expect(
      sendEmailHelper.fn.call(
        {},
        {
          to: 'user@example.com',
          subject: 'Subject',
          html: '<p>Hello</p>',
          failSilently: false,
        },
      ),
    ).rejects.toBe(transportError);
    expect(sails.log.error).toHaveBeenCalledWith(`Error sending email: ${transportError}`);
  });

  test('returns null when sendMail fails and failSilently is true', async () => {
    const transportError = new Error('SMTP error');

    const transporter = {
      sendMail: jest.fn().mockRejectedValue(transportError),
    };

    sails.hooks.smtp.getTransporter.mockReturnValue(transporter);

    const result = await sendEmailHelper.fn.call(
      {},
      {
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Hello</p>',
      },
    );

    expect(result).toBeNull();
    expect(sails.log.error).toHaveBeenCalledWith(`Error sending email: ${transportError}`);
  });
});
