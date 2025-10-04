const {
  mockSailsBase,
  defineHelper,
  makeContext,
  ensureMembershipGlobals,
  resetMocks,
} = require('./_helpers/controllerTestUtils');

// Require controllers
const cardMembershipDelete = require('../api/controllers/card-memberships/delete');
const customFieldCreateInGroup = require('../api/controllers/custom-fields/create-in-custom-field-group');
const customFieldDelete = require('../api/controllers/custom-fields/delete');

describe('membership related controllers', () => {
  let boardMembershipMock;
  let cardMembershipMock;
  let userGetOneMock;

  beforeEach(() => {
    mockSailsBase();
    const { boardMembership, cardMembership, userGetOne } = ensureMembershipGlobals();
    boardMembershipMock = boardMembership;
    cardMembershipMock = cardMembership;
    userGetOneMock = userGetOne;

    // Base helpers containers
    global.sails.helpers.cards = global.sails.helpers.cards || {};
    global.sails.helpers.cardMemberships = global.sails.helpers.cardMemberships || {};
    global.sails.helpers.customFieldGroups = global.sails.helpers.customFieldGroups || {};
    global.sails.helpers.customFields = global.sails.helpers.customFields || {};
    global.sails.helpers.users = global.sails.helpers.users || {};

    // Default isProjectManager false
    global.sails.helpers.users.isProjectManager = jest.fn().mockResolvedValue(false);

    // Path helpers
    defineHelper(['cards', 'getPathToProjectById'], (cardId) => ({
      intercept(code, handler) {
        if (code === 'pathNotFound' && cardId === 'missing') {
          throw handler();
        }
        return {
          card: { id: cardId },
          list: { id: 'list1' },
          board: { id: 'board1' },
          project: { id: 'proj1' },
        };
      },
    }));

    defineHelper(['customFieldGroups', 'getPathToProjectById'], (groupId) => ({
      intercept(code, handler) {
        if (code === 'pathNotFound' && groupId === 'missing') {
          throw handler();
        }
        return {
          customFieldGroup: { id: groupId },
          card: { id: 'card1' },
          list: { id: 'list1' },
          board: { id: 'board1' },
          project: { id: 'proj1' },
        };
      },
    }));

    defineHelper(['customFields', 'getPathToProjectById'], (id) => ({
      intercept(code, handler) {
        if (code === 'pathNotFound' && id === 'missing') {
          throw handler();
        }
        // Simulate toggling between base and group custom field by id prefix
        const isBase = id.startsWith('base');
        return {
          customField: {
            id,
            baseCustomFieldGroupId: isBase ? 'bcg1' : null,
            customFieldGroupId: isBase ? null : 'cfg1',
          },
          baseCustomFieldGroup: isBase ? { id: 'bcg1' } : null,
          customFieldGroup: !isBase ? { id: 'cfg1' } : null,
          card: { id: 'card1' },
          list: { id: 'list1' },
          board: { id: 'board1' },
          project: { id: 'proj1' },
        };
      },
    }));

    // Action helpers
    global.sails.helpers.cardMemberships.deleteOne = {
      with: jest.fn(async ({ record }) => record),
    };
    global.sails.helpers.customFields.createOneInCustomFieldGroup = {
      with: jest.fn(async ({ values }) => ({ id: 'cf1', ...values })),
    };
    global.sails.helpers.customFields.deleteOneInCustomFieldGroup = {
      with: jest.fn(async ({ record }) => record),
    };
    global.sails.helpers.customFields.deleteOneInBaseCustomFieldGroup = {
      with: jest.fn(async ({ record }) => record),
    };
  });

  afterEach(() => {
    resetMocks(boardMembershipMock, cardMembershipMock, userGetOneMock);
  });

  describe('card-memberships/delete', () => {
    test('success deletes card membership', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'editor' });
      cardMembershipMock.mockResolvedValue({ id: 'cm1', userId: 'u2' });
      userGetOneMock.mockResolvedValue({ id: 'u2' });
      const result = await cardMembershipDelete.fn.call(makeContext({}), {
        cardId: 'card1',
        userId: 'u2',
      });
      expect(result.item).toEqual({ id: 'cm1', userId: 'u2' });
      expect(global.sails.helpers.cardMemberships.deleteOne.with).toHaveBeenCalled();
    });

    test('card not found when path helper fails', async () => {
      await expect(
        cardMembershipDelete.fn.call(makeContext({}), { cardId: 'missing', userId: 'u2' }),
      ).rejects.toMatchObject({ cardNotFound: 'Card not found' });
    });

    test('card not found when no board membership', async () => {
      boardMembershipMock.mockResolvedValue(null);
      await expect(
        cardMembershipDelete.fn.call(makeContext({}), { cardId: 'card1', userId: 'u2' }),
      ).rejects.toMatchObject({ cardNotFound: 'Card not found' });
    });

    test('not enough rights when membership not editor', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'viewer' });
      await expect(
        cardMembershipDelete.fn.call(makeContext({}), { cardId: 'card1', userId: 'u2' }),
      ).rejects.toMatchObject({ notEnoughRights: 'Not enough rights' });
    });

    test('user not card member when membership lookup returns null initially', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'editor' });
      cardMembershipMock.mockResolvedValue(null);
      await expect(
        cardMembershipDelete.fn.call(makeContext({}), { cardId: 'card1', userId: 'u2' }),
      ).rejects.toMatchObject({ userNotCardMember: 'User not card member' });
    });

    test('user not card member when deleteOne returns null', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'editor' });
      cardMembershipMock.mockResolvedValue({ id: 'cm1', userId: 'u2' });
      userGetOneMock.mockResolvedValue({ id: 'u2' });
      global.sails.helpers.cardMemberships.deleteOne.with.mockResolvedValue(null);
      await expect(
        cardMembershipDelete.fn.call(makeContext({}), { cardId: 'card1', userId: 'u2' }),
      ).rejects.toMatchObject({ userNotCardMember: 'User not card member' });
    });
  });

  describe('custom-fields/create-in-custom-field-group', () => {
    test('success create custom field', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'editor' });
      const result = await customFieldCreateInGroup.fn.call(makeContext({}), {
        customFieldGroupId: 'cfg1',
        position: 1,
        name: 'Field',
        showOnFrontOfCard: true,
      });
      expect(result.item).toEqual(expect.objectContaining({ id: 'cf1', name: 'Field' }));
    });

    test('group not found path', async () => {
      await expect(
        customFieldCreateInGroup.fn.call(makeContext({}), {
          customFieldGroupId: 'missing',
          position: 1,
          name: 'X',
        }),
      ).rejects.toMatchObject({ customFieldGroupNotFound: 'Custom field group not found' });
    });

    test('group not found when no membership', async () => {
      boardMembershipMock.mockResolvedValue(null);
      await expect(
        customFieldCreateInGroup.fn.call(makeContext({}), {
          customFieldGroupId: 'cfg1',
          position: 1,
          name: 'X',
        }),
      ).rejects.toMatchObject({ customFieldGroupNotFound: 'Custom field group not found' });
    });

    test('not enough rights when viewer', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'viewer' });
      await expect(
        customFieldCreateInGroup.fn.call(makeContext({}), {
          customFieldGroupId: 'cfg1',
          position: 1,
          name: 'X',
        }),
      ).rejects.toMatchObject({ notEnoughRights: 'Not enough rights' });
    });
  });

  describe('custom-fields/delete', () => {
    test('delete in base custom field group requires project manager', async () => {
      // Base id triggers baseCustomFieldGroup branch
      global.sails.helpers.users.isProjectManager.mockResolvedValue(true);
      const result = await customFieldDelete.fn.call(makeContext({}), { id: 'base123' });
      expect(result.item).toEqual(expect.objectContaining({ id: 'base123' }));
      expect(
        global.sails.helpers.customFields.deleteOneInBaseCustomFieldGroup.with,
      ).toHaveBeenCalled();
    });

    test('base custom field not found when not project manager', async () => {
      global.sails.helpers.users.isProjectManager.mockResolvedValue(false);
      await expect(
        customFieldDelete.fn.call(makeContext({}), { id: 'base123' }),
      ).rejects.toMatchObject({ customFieldNotFound: 'Custom field not found' });
    });

    test('delete in custom field group success (editor membership)', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'editor' });
      const result = await customFieldDelete.fn.call(makeContext({}), { id: 'group456' });
      expect(result.item).toEqual(expect.objectContaining({ id: 'group456' }));
      expect(global.sails.helpers.customFields.deleteOneInCustomFieldGroup.with).toHaveBeenCalled();
    });

    test('custom field not found when no membership', async () => {
      boardMembershipMock.mockResolvedValue(null);
      await expect(
        customFieldDelete.fn.call(makeContext({}), { id: 'group456' }),
      ).rejects.toMatchObject({ customFieldNotFound: 'Custom field not found' });
    });

    test('not enough rights when not editor', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'viewer' });
      await expect(
        customFieldDelete.fn.call(makeContext({}), { id: 'group456' }),
      ).rejects.toMatchObject({ notEnoughRights: 'Not enough rights' });
    });

    test('custom field not found when delete returns null', async () => {
      boardMembershipMock.mockResolvedValue({ id: 'bm1', role: 'editor' });
      global.sails.helpers.customFields.deleteOneInCustomFieldGroup.with.mockResolvedValue(null);
      await expect(
        customFieldDelete.fn.call(makeContext({}), { id: 'group456' }),
      ).rejects.toMatchObject({ customFieldNotFound: 'Custom field not found' });
    });
  });
});
