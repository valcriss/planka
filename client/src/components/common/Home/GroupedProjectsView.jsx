/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { canUserCreateProject, isUserAdminOrProjectOwner } from '../../../utils/record-helpers';
import { ProjectGroups, ProjectTypes } from '../../../constants/Enums';
import { ProjectGroupIcons } from '../../../constants/Icons';
import Projects from './Projects';

const TITLE_BY_GROUP = {
  [ProjectGroups.MY_OWN]: 'common.myOwn',
  [ProjectGroups.TEAM]: 'common.team',
  [ProjectGroups.SHARED_WITH_ME]: 'common.sharedWithMe',
  [ProjectGroups.OTHERS]: 'common.others',
};

const DEFAULT_TYPE_BY_GROUP = {
  [ProjectGroups.MY_OWN]: ProjectTypes.PRIVATE,
  [ProjectGroups.TEAM]: ProjectTypes.SHARED,
};

const GroupedProjectsView = React.memo(() => {
  const projectIdsByGroup = useSelector(selectors.selectFilteredProjctIdsByGroupForCurrentUser);

  const { canAddProject, canAddTeamProject } = useSelector((state) => {
    const user = selectors.selectCurrentUser(state);

    return {
      canAddProject: canUserCreateProject(user),
      canAddTeamProject: isUserAdminOrProjectOwner(user),
    };
  });

  const dispatch = useDispatch();

  const handleAdd = useCallback(
    (defaultType) => {
      dispatch(entryActions.openAddProjectModal(defaultType));
    },
    [dispatch],
  );

  return (
    <>
      {[ProjectGroups.MY_OWN, ProjectGroups.TEAM].map((group) => {
        const hasProjects = projectIdsByGroup[group].length > 0;
        const canAddToGroup = group === ProjectGroups.TEAM ? canAddTeamProject : canAddProject;
        const onAdd =
          canAddToGroup && DEFAULT_TYPE_BY_GROUP[group]
            ? () => handleAdd(DEFAULT_TYPE_BY_GROUP[group])
            : undefined;

        return (
          (hasProjects || canAddToGroup) && (
            <Projects
              key={group}
              ids={projectIdsByGroup[group]}
              title={TITLE_BY_GROUP[group]}
              titleIcon={ProjectGroupIcons[group]}
              onAdd={onAdd}
            />
          )
        );
      })}
      {[ProjectGroups.SHARED_WITH_ME, ProjectGroups.OTHERS].map(
        (group) =>
          projectIdsByGroup[group].length > 0 && (
            <Projects
              withTypeIndicator
              key={group}
              ids={projectIdsByGroup[group]}
              title={TITLE_BY_GROUP[group]}
              titleIcon={ProjectGroupIcons[group]}
            />
          ),
      )}
    </>
  );
});

export default GroupedProjectsView;
