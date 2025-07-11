/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector as createReselectSelector } from 'reselect';
import { createSelector as createReduxOrmSelector } from 'redux-orm';

import orm from '../orm';
import { selectCurrentUserId } from './users';
import matchPaths from '../utils/match-paths';
import Paths from '../constants/Paths';

export const selectPathname = ({
  router: {
    location: { pathname },
  },
}) => pathname;

export const selectPathsMatch = createReselectSelector(selectPathname, (pathname) =>
  matchPaths(pathname, Object.values(Paths)),
);

export const selectPath = createReduxOrmSelector(
  orm,
  selectPathsMatch,
  (state) => selectCurrentUserId(state),
  ({ User, Project, Board, Card }, pathsMatch, currentUserId) => {
    if (pathsMatch) {
      const currentUserModel = User.withId(currentUserId);

      switch (pathsMatch.pattern.path) {
        case Paths.PROJECTS: {
          const projectModel = Project.all()
            .toModelArray()
            .find((p) => p.code === pathsMatch.params.code);

          if (!projectModel || !projectModel.isAvailableForUser(currentUserModel)) {
            return {
              projectId: null,
            };
          }

          return {
            projectId: projectModel.id,
          };
        }
        case Paths.PROJECT_EPICS: {
          const projectModel = Project.all()
            .toModelArray()
            .find((p) => p.code === pathsMatch.params.code);

          if (!projectModel || !projectModel.isAvailableForUser(currentUserModel)) {
            return {
              projectId: null,
            };
          }

          return {
            projectId: projectModel.id,
          };
        }
        case Paths.BOARDS: {
          const projectModel = Project.all()
            .toModelArray()
            .find((p) => p.code === pathsMatch.params.code);

          if (!projectModel || !projectModel.isAvailableForUser(currentUserModel)) {
            return {
              boardId: null,
              projectId: null,
            };
          }

          const boardsModels = projectModel.getBoardsModelArrayAvailableForUser(
            currentUserModel,
          );
          const boardModel = boardsModels.find(
            (b) => b.slug === pathsMatch.params.slug,
          );

          if (!boardModel) {
            return {
              boardId: null,
              projectId: null,
            };
          }

          return {
            boardId: boardModel.id,
            projectId: boardModel.projectId,
          };
        }
        case Paths.CARDS: {
          const projectModel = Project.all()
            .toModelArray()
            .find((p) => p.code === pathsMatch.params.projectCode);
          const cardModel =
            projectModel &&
            Card.all()
              .toModelArray()
              .find((c) => {
                if (c.number !== Number(pathsMatch.params.number)) {
                  return false;
                }

                const boardModel = Board.withId(c.boardId);
                return boardModel && boardModel.projectId === projectModel.id;
              });

          if (!cardModel || !cardModel.isAvailableForUser(currentUserModel)) {
            return {
              cardId: null,
              boardId: null,
              projectId: null,
            };
          }

          const boardModel = Board.withId(cardModel.boardId);

          return {
            cardId: cardModel.id,
            boardId: boardModel ? boardModel.id : null,
            projectId: boardModel ? boardModel.projectId : null,
          };
        }
        default:
      }
    }

    return {};
  },
);

export default {
  selectPathname,
  selectPathsMatch,
  selectPath,
};
