const getSubscriptionUserIds = require('../api/helpers/cards/get-subscription-user-ids');

const originalSails = global.sails;
const originalCardSubscription = global.CardSubscription;

describe('helpers/cards/get-subscription-user-ids', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        utils: {
          mapRecords: jest.fn().mockReturnValue(['user-1', 'user-2']),
        },
      },
    };

    global.CardSubscription = {
      qm: {
        getByCardId: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalCardSubscription === 'undefined') {
      delete global.CardSubscription;
    } else {
      global.CardSubscription = originalCardSubscription;
    }
  });

  test('returns mapped subscription user ids', async () => {
    const result = await getSubscriptionUserIds.fn({
      id: 'card-1',
      exceptUserIdOrIds: ['user-3'],
    });

    expect(CardSubscription.qm.getByCardId).toHaveBeenCalledWith('card-1', {
      exceptUserIdOrIds: ['user-3'],
    });
    expect(result).toEqual(['user-1', 'user-2']);
  });
});
