const { expect } = require('chai');

describe('CardType (model)', () => {
  let project;
  before(async () => {
    const user = await User.findOne();
    ({ project } = await Project.qm.createOne(
      {
        name: 'Test Project',
        type: Project.Types.SHARED,
      },
      { user },
    ));
  });

  it('should create base and project card types', async () => {
    const cardType = await CardType.qm.createOne({
      projectId: project.id,
      name: 'Bug',
    });

    const fetched = await CardType.qm.getOneById(cardType.id, {
      projectId: project.id,
    });
    expect(fetched).to.be.an('object');
    expect(fetched.name).to.equal('Bug');
  });
});
