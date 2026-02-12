jest.mock('redux-orm', () => ({
  createSelector: (...args) => {
    const projector = args[args.length - 1];
    const inputSelectors = args.slice(1, -1);

    return (state, ...params) => {
      const values = inputSelectors.map((selector) => selector(state, ...params));
      return projector(state.models, ...values);
    };
  },
}));

jest.mock('../src/orm', () => ({}));

import {
  makeSelectAttachmentById,
  selectIsAttachmentWithIdExists,
} from '../src/selectors/attachments';
import { makeSelectActivityById } from '../src/selectors/activities';
import { makeSelectBackgroundImageById, selectIsBackgroundImageWithIdExists } from '../src/selectors/background-images';
import {
  makeSelectBaseCustomFieldGroupById,
  makeSelectCustomFieldsByBaseGroupId,
} from '../src/selectors/base-custom-field-groups';
import { makeSelectBoardMembershipById } from '../src/selectors/board-memberships';
import { makeSelectCommentById } from '../src/selectors/comments';
import {
  makeSelectCardTypeById,
  makeSelectCardTypeIdsByProjectId,
  makeSelectBaseCardTypeById,
  selectBaseCardTypeIds,
} from '../src/selectors/card-types';
import {
  makeSelectCustomFieldById,
} from '../src/selectors/custom-fields';
import { makeSelectCustomFieldValueById } from '../src/selectors/custom-field-values';
import {
  makeSelectCustomFieldGroupById,
  makeSelectCustomFieldIdsByGroupId,
  makeSelectCustomFieldsByGroupId,
} from '../src/selectors/custom-field-groups';
import { makeSelectEpicById, makeSelectEpicIdsByProjectId, makeSelectCardIdsByEpicId } from '../src/selectors/epics';
import { makeSelectLabelById } from '../src/selectors/labels';
import {
  makeSelectNotificationById,
  makeSelectNotificationIdsByCardId,
} from '../src/selectors/notifications';
import { makeSelectNotificationServiceById } from '../src/selectors/notification-services';
import { makeSelectProjectManagerById } from '../src/selectors/project-managers';
import { makeSelectTaskById } from '../src/selectors/tasks';
import { makeSelectTaskListById, makeSelectTasksByTaskListId } from '../src/selectors/task-lists';
import { makeSelectWebhookById, selectWebhookIds } from '../src/selectors/webhooks';

const createState = (models) => ({
  models,
});

describe('ORM-backed entity selectors', () => {
  test('selects attachment by id with persisted flag and existence selector', () => {
    const selectAttachmentById = makeSelectAttachmentById();
    const state = createState({
      Attachment: {
        withId: jest.fn((id) => {
          if (id === '1') {
            return {
              id: '1',
              ref: { id: '1', name: 'file' },
            };
          }

          if (id === 'local:1') {
            return {
              id: 'local:1',
              ref: { id: 'local:1', name: 'draft file' },
            };
          }

          return null;
        }),
        idExists: jest.fn((id) => id === '1'),
      },
    });

    expect(selectAttachmentById(state, '1')).toEqual({
      id: '1',
      name: 'file',
      isPersisted: true,
    });
    expect(selectAttachmentById(state, 'local:1')).toEqual({
      id: 'local:1',
      name: 'draft file',
      isPersisted: false,
    });
    expect(selectAttachmentById(state, 'unknown')).toBeNull();
    expect(selectIsAttachmentWithIdExists(state, '1')).toBe(true);
    expect(selectIsAttachmentWithIdExists(state, 'unknown')).toBe(false);
  });

  test('selects comment by id with persisted flag', () => {
    const selectCommentById = makeSelectCommentById();
    const state = createState({
      Comment: {
        withId: jest.fn((id) => {
          if (id === '1') {
            return {
              id: '1',
              ref: { id: '1', text: 'hello' },
            };
          }

          return null;
        }),
      },
    });

    expect(selectCommentById(state, '1')).toEqual({
      id: '1',
      text: 'hello',
      isPersisted: true,
    });
    expect(selectCommentById(state, 'unknown')).toBeNull();
  });

  test('selects notification by id and ids by card id', () => {
    const selectNotificationById = makeSelectNotificationById();
    const selectNotificationIdsByCardId = makeSelectNotificationIdsByCardId();
    const state = createState({
      Notification: {
        withId: jest.fn((id) =>
          id === 'n1'
            ? {
                ref: { id: 'n1', cardId: 'c1' },
              }
            : null,
        ),
        filter: jest.fn(({ cardId }) => ({
          toRefArray: () =>
            cardId === 'c1'
              ? [
                  { id: 'n1' },
                  { id: 'n2' },
                ]
              : [],
        })),
      },
    });

    expect(selectNotificationById(state, 'n1')).toEqual({
      id: 'n1',
      cardId: 'c1',
    });
    expect(selectNotificationById(state, 'missing')).toBeNull();
    expect(selectNotificationIdsByCardId(state, 'c1')).toEqual(['n1', 'n2']);
    expect(selectNotificationIdsByCardId(state, 'other')).toEqual([]);
  });

  test('selects notification service and task entities with persisted flags', () => {
    const selectNotificationServiceById = makeSelectNotificationServiceById();
    const selectTaskById = makeSelectTaskById();
    const state = createState({
      NotificationService: {
        withId: jest.fn((id) =>
          id
            ? {
                id,
                ref: { id, url: 'https://example.test' },
              }
            : null,
        ),
      },
      Task: {
        withId: jest.fn((id) =>
          id
            ? {
                id,
                ref: { id, name: 'Task' },
              }
            : null,
        ),
      },
    });

    expect(selectNotificationServiceById(state, '10')).toEqual({
      id: '10',
      url: 'https://example.test',
      isPersisted: true,
    });
    expect(selectNotificationServiceById(state, 'local:10')).toEqual({
      id: 'local:10',
      url: 'https://example.test',
      isPersisted: false,
    });
    expect(selectNotificationServiceById(state, null)).toBeNull();
    expect(selectTaskById(state, '20')).toEqual({
      id: '20',
      name: 'Task',
      isPersisted: true,
    });
    expect(selectTaskById(state, 'local:20')).toEqual({
      id: 'local:20',
      name: 'Task',
      isPersisted: false,
    });
    expect(selectTaskById(state, null)).toBeNull();
  });

  test('selects task list by id and tasks by task list id', () => {
    const selectTaskListById = makeSelectTaskListById();
    const selectTasksByTaskListId = makeSelectTasksByTaskListId();
    const state = createState({
      TaskList: {
        withId: jest.fn((id) =>
          id === 'tl1'
            ? {
                id: 'tl1',
                ref: { id: 'tl1', name: 'Checklist' },
                getTasksQuerySet: jest.fn(() => ({
                  toRefArray: () => [
                    { id: 't1', name: 'Task 1' },
                    { id: 't2', name: 'Task 2' },
                  ],
                })),
              }
            : null,
        ),
      },
    });

    expect(selectTaskListById(state, 'tl1')).toEqual({
      id: 'tl1',
      name: 'Checklist',
      isPersisted: true,
    });
    expect(selectTaskListById(state, 'unknown')).toBeNull();
    expect(selectTasksByTaskListId(state, 'tl1')).toEqual([
      { id: 't1', name: 'Task 1' },
      { id: 't2', name: 'Task 2' },
    ]);
    expect(selectTasksByTaskListId(state, 'unknown')).toBeNull();
  });

  test('selects activity/background-image/board-membership/label/project-manager by id', () => {
    const selectActivityById = makeSelectActivityById();
    const selectBackgroundImageById = makeSelectBackgroundImageById();
    const selectBoardMembershipById = makeSelectBoardMembershipById();
    const selectLabelById = makeSelectLabelById();
    const selectProjectManagerById = makeSelectProjectManagerById();
    const state = createState({
      Activity: {
        withId: jest.fn((id) => (id ? { id, ref: { id, type: 'cardCreate' } } : null)),
      },
      BackgroundImage: {
        withId: jest.fn((id) => (id ? { id, ref: { id, name: 'bg' } } : null)),
        idExists: jest.fn((id) => id === 'bg1'),
      },
      BoardMembership: {
        withId: jest.fn((id) => (id ? { id, ref: { id, role: 'editor' } } : null)),
      },
      Label: {
        withId: jest.fn((id) => (id ? { id, ref: { id, name: 'Urgent' } } : null)),
      },
      ProjectManager: {
        withId: jest.fn((id) => (id ? { ref: { id, userId: 'u1' } } : null)),
      },
    });

    expect(selectActivityById(state, 'a1')).toEqual({ id: 'a1', type: 'cardCreate', isPersisted: true });
    expect(selectActivityById(state, 'local:a1')).toEqual({
      id: 'local:a1',
      type: 'cardCreate',
      isPersisted: false,
    });
    expect(selectActivityById(state, null)).toBeNull();

    expect(selectBackgroundImageById(state, 'bg1')).toEqual({ id: 'bg1', name: 'bg', isPersisted: true });
    expect(selectBackgroundImageById(state, null)).toBeNull();
    expect(selectIsBackgroundImageWithIdExists(state, 'bg1')).toBe(true);
    expect(selectIsBackgroundImageWithIdExists(state, 'bg2')).toBe(false);

    expect(selectBoardMembershipById(state, 'bm1')).toEqual({
      id: 'bm1',
      role: 'editor',
      isPersisted: true,
    });
    expect(selectBoardMembershipById(state, null)).toBeNull();

    expect(selectLabelById(state, 'l1')).toEqual({
      id: 'l1',
      name: 'Urgent',
      isPersisted: true,
    });
    expect(selectLabelById(state, 'local:l1')).toEqual({
      id: 'local:l1',
      name: 'Urgent',
      isPersisted: false,
    });
    expect(selectLabelById(state, null)).toBeNull();

    expect(selectProjectManagerById(state, 'pm1')).toEqual({
      id: 'pm1',
      userId: 'u1',
    });
    expect(selectProjectManagerById(state, null)).toBeNull();
  });

  test('selects epics and related ids', () => {
    const selectEpicById = makeSelectEpicById();
    const selectEpicIdsByProjectId = makeSelectEpicIdsByProjectId();
    const selectCardIdsByEpicId = makeSelectCardIdsByEpicId();
    const state = createState({
      Epic: {
        withId: jest.fn((id) => {
          if (id === 'e1') {
            return {
              id: 'e1',
              ref: { id: 'e1', projectId: 'p1' },
              cards: {
                toRefArray: () => [{ id: 'c1' }, { id: 'c2' }],
              },
            };
          }

          if (id === 'local:e1') {
            return {
              id: 'local:e1',
              ref: { id: 'local:e1', projectId: 'p1' },
              cards: {
                toRefArray: () => [],
              },
            };
          }

          return null;
        }),
        filter: jest.fn(({ projectId }) => ({
          toRefArray: () =>
            projectId === 'p1'
              ? [
                  { id: 'e2', position: 2 },
                  { id: 'e1', position: 1 },
                ]
              : [],
        })),
      },
    });

    expect(selectEpicById(state, 'e1')).toEqual({
      id: 'e1',
      projectId: 'p1',
      isPersisted: true,
    });
    expect(selectEpicById(state, 'local:e1')).toEqual({
      id: 'local:e1',
      projectId: 'p1',
      isPersisted: false,
    });
    expect(selectEpicById(state, null)).toBeNull();

    expect(selectEpicIdsByProjectId(state, 'p1')).toEqual(['e1', 'e2']);
    expect(selectEpicIdsByProjectId(state, null)).toBeNull();
    expect(selectEpicIdsByProjectId(state, 'missing')).toEqual([]);

    expect(selectCardIdsByEpicId(state, 'e1')).toEqual(['c1', 'c2']);
    expect(selectCardIdsByEpicId(state, 'missing')).toEqual([]);
  });

  test('selects custom fields and custom field values/groups', () => {
    const selectCustomFieldById = makeSelectCustomFieldById();
    const selectCustomFieldValueById = makeSelectCustomFieldValueById();
    const selectCustomFieldGroupById = makeSelectCustomFieldGroupById();
    const selectCustomFieldIdsByGroupId = makeSelectCustomFieldIdsByGroupId();
    const selectCustomFieldsByGroupId = makeSelectCustomFieldsByGroupId();
    const state = createState({
      CustomField: {
        withId: jest.fn((id) =>
          id
            ? {
                id,
                ref: { id, name: 'Priority' },
              }
            : null,
        ),
      },
      CustomFieldValue: {
        withId: jest.fn((id) =>
          id
            ? {
                ref: { id, value: 'High' },
              }
            : null,
        ),
      },
      CustomFieldGroup: {
        withId: jest.fn((id) => {
          if (!id) {
            return null;
          }
          if (id === 'missing') {
            return null;
          }

          if (id === 'cfg1') {
            return {
              id: 'cfg1',
              name: '',
              baseCustomFieldGroup: { name: 'Base Name' },
              ref: { id: 'cfg1', name: '' },
              getCustomFieldsModelArray: () => [
                { id: 'cf1', ref: { id: 'cf1', name: 'A' } },
                { id: 'cf2', ref: { id: 'cf2', name: 'B' } },
              ],
            };
          }

          return {
            id,
            name: 'Group Name',
            baseCustomFieldGroup: { name: 'Ignored' },
            ref: { id, name: 'Group Name' },
            getCustomFieldsModelArray: () => [],
          };
        }),
      },
    });

    expect(selectCustomFieldById(state, 'cf1')).toEqual({
      id: 'cf1',
      name: 'Priority',
      isPersisted: true,
    });
    expect(selectCustomFieldById(state, 'local:cf1')).toEqual({
      id: 'local:cf1',
      name: 'Priority',
      isPersisted: false,
    });
    expect(selectCustomFieldById(state, null)).toBeNull();

    expect(selectCustomFieldValueById(state, 'cfv1')).toEqual({
      id: 'cfv1',
      value: 'High',
    });
    expect(selectCustomFieldValueById(state, null)).toBeNull();

    expect(selectCustomFieldGroupById(state, 'cfg1')).toEqual({
      id: 'cfg1',
      name: 'Base Name',
      isPersisted: true,
    });
    expect(selectCustomFieldGroupById(state, 'missing')).toBeNull();
    expect(selectCustomFieldGroupById(state, null)).toBeNull();
    expect(selectCustomFieldIdsByGroupId(state, 'cfg1')).toEqual(['cf1', 'cf2']);
    expect(selectCustomFieldIdsByGroupId(state, 'missing')).toBeNull();
    expect(selectCustomFieldIdsByGroupId(state, null)).toBeNull();
    expect(selectCustomFieldsByGroupId(state, 'cfg1')).toEqual([
      { id: 'cf1', name: 'A' },
      { id: 'cf2', name: 'B' },
    ]);
    expect(selectCustomFieldsByGroupId(state, 'missing')).toBeNull();
    expect(selectCustomFieldsByGroupId(state, null)).toBeNull();
  });

  test('selects webhooks by id and returns all webhook ids', () => {
    const selectWebhookById = makeSelectWebhookById();
    const state = createState({
      Webhook: {
        withId: jest.fn((id) =>
          id
            ? {
                id,
                ref: { id, url: 'https://hook.example' },
              }
            : null,
        ),
        getAllQuerySet: jest.fn(() => ({
          toRefArray: () => [{ id: 'w1' }, { id: 'w2' }],
        })),
      },
    });

    expect(selectWebhookById(state, 'w1')).toEqual({
      id: 'w1',
      url: 'https://hook.example',
      isPersisted: true,
    });
    expect(selectWebhookById(state, 'local:w1')).toEqual({
      id: 'local:w1',
      url: 'https://hook.example',
      isPersisted: false,
    });
    expect(selectWebhookById(state, null)).toBeNull();
    expect(selectWebhookIds(state)).toEqual(['w1', 'w2']);
  });

  test('selects base custom field groups and fields by base group id', () => {
    const selectBaseCustomFieldGroupById = makeSelectBaseCustomFieldGroupById();
    const selectCustomFieldsByBaseGroupId = makeSelectCustomFieldsByBaseGroupId();
    const state = createState({
      BaseCustomFieldGroup: {
        withId: jest.fn((id) => {
          if (!id || id === 'missing') {
            return null;
          }

          return {
            id,
            ref: { id, name: 'Base Group' },
            getCustomFieldsQuerySet: () => ({
              toRefArray: () => [{ id: 'cf1' }, { id: 'cf2' }],
            }),
          };
        }),
      },
    });

    expect(selectBaseCustomFieldGroupById(state, 'bg1')).toEqual({
      id: 'bg1',
      name: 'Base Group',
      isPersisted: true,
    });
    expect(selectBaseCustomFieldGroupById(state, 'local:bg1')).toEqual({
      id: 'local:bg1',
      name: 'Base Group',
      isPersisted: false,
    });
    expect(selectBaseCustomFieldGroupById(state, 'missing')).toBeNull();
    expect(selectCustomFieldsByBaseGroupId(state, null)).toBeNull();
    expect(selectCustomFieldsByBaseGroupId(state, 'missing')).toBeNull();
    expect(selectCustomFieldsByBaseGroupId(state, 'bg1')).toEqual([{ id: 'cf1' }, { id: 'cf2' }]);
  });

  test('selects card types and base card types', () => {
    const selectCardTypeById = makeSelectCardTypeById();
    const selectCardTypeIdsByProjectId = makeSelectCardTypeIdsByProjectId();
    const selectBaseCardTypeById = makeSelectBaseCardTypeById();
    const state = createState({
      CardType: {
        withId: jest.fn((id) => {
          if (!id || id === 'missing') {
            return null;
          }

          return {
            id,
            ref: { id, projectId: 'p1', name: 'Bug' },
          };
        }),
        filter: jest.fn(({ projectId }) => ({
          toRefArray: () => (projectId === 'p1' ? [{ id: 'ct1' }, { id: 'ct2' }] : []),
        })),
      },
      BaseCardType: {
        withId: jest.fn((id) => {
          if (!id || id === 'missing') {
            return null;
          }

          return {
            id,
            ref: { id, name: 'Base Type' },
          };
        }),
        all: jest.fn(() => ({
          toRefArray: () => [{ id: 'bct1' }, { id: 'bct2' }],
        })),
      },
    });

    expect(selectCardTypeById(state, 'ct1')).toEqual({
      id: 'ct1',
      projectId: 'p1',
      name: 'Bug',
      isPersisted: true,
    });
    expect(selectCardTypeById(state, 'local:ct1')).toEqual({
      id: 'local:ct1',
      projectId: 'p1',
      name: 'Bug',
      isPersisted: false,
    });
    expect(selectCardTypeById(state, 'missing')).toBeNull();

    expect(selectCardTypeIdsByProjectId(state, null)).toBeNull();
    expect(selectCardTypeIdsByProjectId(state, 'p1')).toEqual(['ct1', 'ct2']);
    expect(selectCardTypeIdsByProjectId(state, 'p2')).toEqual([]);

    expect(selectBaseCardTypeById(state, 'bct1')).toEqual({
      id: 'bct1',
      name: 'Base Type',
      isPersisted: true,
    });
    expect(selectBaseCardTypeById(state, 'local:bct1')).toEqual({
      id: 'local:bct1',
      name: 'Base Type',
      isPersisted: false,
    });
    expect(selectBaseCardTypeById(state, 'missing')).toBeNull();
    expect(selectBaseCardTypeIds(state)).toEqual(['bct1', 'bct2']);
  });
});
