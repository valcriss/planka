const _ = require('lodash');
global._ = _;
const { getRemoteAddress } = require('../utils/remote-address');

describe('getRemoteAddress', () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
  });

  test('returns request.ip when TRUST_PROXY is not true', () => {
    const req = { ip: '1.2.3.4', ips: [] };
    expect(getRemoteAddress(req)).toBe('1.2.3.4');
  });

  test('uses first forwarded ip when TRUST_PROXY=true', () => {
    process.env.TRUST_PROXY = 'true';
    const req = { ip: '5.5.5.5', ips: ['2.2.2.2', '3.3.3.3'] };
    expect(getRemoteAddress(req)).toBe('2.2.2.2');
  });

  test('converts ipv6 representation', () => {
    const req = { ip: '::ffff:127.0.0.1', ips: [] };
    expect(getRemoteAddress(req)).toBe('127.0.0.1');
  });
});
