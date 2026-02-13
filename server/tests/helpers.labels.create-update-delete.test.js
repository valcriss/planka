const lodash = require('lodash');
const createLabel = require('../api/helpers/labels/create-one');
const updateLabel = require('../api/helpers/labels/update-one');
const deleteLabel = require('../api/helpers/labels/delete-one');

const originalSails = global.sails;
const originalLabel = global.Label;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/labels create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 100, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        labels: {
          deleteRelated: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.Label = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([]),
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        LABEL_CREATE: 'labelCreate',
        LABEL_UPDATE: 'labelUpdate',
        LABEL_DELETE: 'labelDelete',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalLabel === 'undefined') {
      delete global.Label;
    } else {
      global.Label = originalLabel;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates label and sends webhooks', async () => {
    Label.qm.createOne.mockResolvedValue({ id: 'label-1', boardId: 'board-1' });
    const result = await createLabel.fn({
      values: { board: { id: 'board-1' }, position: 1 },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'label-1', boardId: 'board-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates label and sends webhooks', async () => {
    Label.qm.updateOne.mockResolvedValue({ id: 'label-2', boardId: 'board-1' });
    const result = await updateLabel.fn({
      record: { id: 'label-2', boardId: 'board-1' },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'label-2', boardId: 'board-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('deletes label and sends webhooks', async () => {
    Label.qm.deleteOne.mockResolvedValue({ id: 'label-3', boardId: 'board-1' });
    const result = await deleteLabel.fn({
      record: { id: 'label-3' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'label-3', boardId: 'board-1' });
    expect(sails.helpers.labels.deleteRelated).toHaveBeenCalled();
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
