/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Icon } from 'semantic-ui-react';
import { push } from '../../../lib/redux-router';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import { BoardMembershipRoles, CardTypes, ListTypes } from '../../../constants/Enums';
import ProjectContent from './ProjectContent';
import StoryContent from './StoryContent';
import InlineContent from './InlineContent';
import EditName from './EditName';
import ActionsStep from './ActionsStep';

import styles from './Card.module.scss';
import globalStyles from '../../../styles.module.scss';

const Card = React.memo(({ id, isInline = false }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectIsCardWithIdRecent = useMemo(() => selectors.makeSelectIsCardWithIdRecent(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
  const selectProjectById = useMemo(() => selectors.makeSelectProjectById(), []);

  const card = useSelector((state) => selectCardById(state, id));
  const list = useSelector((state) => selectListById(state, card.listId));
  const board = useSelector((state) => selectBoardById(state, card.boardId));
  const project = useSelector((state) => selectProjectById(state, board.projectId));

  const isHighlightedAsRecent = useSelector((state) => {
    const { turnOffRecentCardHighlighting } = selectors.selectCurrentUser(state);

    if (turnOffRecentCardHighlighting) {
      return false;
    }

    return selectIsCardWithIdRecent(state, id);
  });

  const canUseActions = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [isEditNameOpened, setIsEditNameOpened] = useState(false);

  const handleClick = useCallback(() => {
    if (document.activeElement) {
      document.activeElement.blur();
    }

    const path =
      card && project
        ? Paths.CARDS.replace(':projectCode', project.code).replace(':number', card.number)
        : `/cards/${id}`;
    dispatch(push(path));
  }, [id, dispatch, card, project]);

  const handleNameEdit = useCallback(() => {
    setIsEditNameOpened(true);
  }, []);

  const handleEditNameClose = useCallback(() => {
    setIsEditNameOpened(false);
  }, []);

  const ActionsPopup = usePopup(ActionsStep);

  if (isEditNameOpened) {
    return <EditName cardId={id} onClose={handleEditNameClose} />;
  }

  let Content;
  if (isInline) {
    Content = InlineContent;
  } else {
    switch (card.type) {
      case CardTypes.PROJECT:
        Content = ProjectContent;

        break;
      case CardTypes.STORY:
        Content = StoryContent;

        break;
      default:
        Content = ProjectContent;
        break;
    }
  }

  const colorLineNode = list.color && (
    <div
      className={classNames(
        styles.colorLine,
        !list.color.startsWith('#') &&
          globalStyles[`background${upperFirst(camelCase(list.color))}`],
      )}
      style={list.color.startsWith('#') ? { backgroundColor: list.color } : null}
    />
  );

  return (
    <div
      className={classNames(styles.wrapper, isHighlightedAsRecent && styles.wrapperRecent, 'card')}
    >
      {card.isPersisted ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                       jsx-a11y/no-static-element-interactions */}
          <div
            className={classNames(
              styles.content,
              list.type === ListTypes.CLOSED && styles.contentDisabled,
            )}
            onClick={handleClick}
          >
            <Content cardId={id} />
            {colorLineNode}
          </div>
          {canUseActions && (
            <ActionsPopup cardId={id} onNameEdit={handleNameEdit}>
              <Button className={styles.actionsButton}>
                <Icon fitted name="pencil" size="small" />
              </Button>
            </ActionsPopup>
          )}
        </>
      ) : (
        <span
          className={classNames(
            styles.content,
            list.type === ListTypes.CLOSED && styles.contentDisabled,
          )}
        >
          <Content cardId={id} />
          {colorLineNode}
        </span>
      )}
    </div>
  );
});

Card.propTypes = {
  id: PropTypes.string.isRequired,
  isInline: PropTypes.bool, // eslint-disable-line react/require-default-props
};

export default Card;
