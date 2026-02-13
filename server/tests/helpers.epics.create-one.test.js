const lodash = require('lodash');
const createEpic = require('../api/helpers/epics/create-one');

const originalSails = global.sails;
const originalEpic = global.Epic;
const originalLodash = global._;
describe('helpers/epics/create-one', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.Epic = {
      qm: {
        createOne: jest.fn(),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalEpic === 'undefined') {
      delete global.Epic;
    } else {
      global.Epic = originalEpic;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates epic with defaults and broadcasts', async () => {
    Epic.qm.createOne.mockResolvedValue({
      id: 'epic-1',
      projectId: 'project-1',
    });
    const result = await createEpic.fn({
      values: {
        name: 'Epic Name',
        project: { id: 'project-1' },
      },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'epic-1', projectId: 'project-1' });
    expect(Epic.qm.createOne).toHaveBeenCalledWith({
      name: 'Epic Name',
      icon: null,
      color: '#000000',
      projectId: 'project-1',
      project: { id: 'project-1' },
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'project:project-1',
      'epicCreate',
      { item: { id: 'epic-1', projectId: 'project-1' } },
      { id: 'req-1' },
    );
  });
  test('uses provided icon and color', async () => {
    Epic.qm.createOne.mockResolvedValue({
      id: 'epic-2',
      projectId: 'project-2',
    });
    await createEpic.fn({
      values: {
        name: 'Epic Name',
        icon: 'rocket',
        color: '#ff00ff',
        project: { id: 'project-2' },
      },
    });
    expect(Epic.qm.createOne).toHaveBeenCalledWith({
      name: 'Epic Name',
      icon: 'rocket',
      color: '#ff00ff',
      projectId: 'project-2',
      project: { id: 'project-2' },
    });
  });
});
