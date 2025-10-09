/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Draggable } from '@hello-pangea/dnd';

import selectors from '../../../selectors';
import { BoardMembershipRoles } from '../../../constants/Enums';
import Card from '../Card';

import styles from './DraggableCard.module.scss';

const DraggableCard = React.memo(
  ({ id, index, laneKey = null, className = undefined, ...props }) => {
    const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

    const card = useSelector((state) => selectCardById(state, id));

    const canDrag = useSelector((state) => {
      const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
      return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
    });

    const draggableId = laneKey ? `card:${id}:lane:${laneKey}` : `card:${id}`;

    return (
      <Draggable
        draggableId={draggableId}
        index={index}
        isDragDisabled={!card.isPersisted || !canDrag}
      >
        {({ innerRef, draggableProps, dragHandleProps }) => (
          <div
            {...draggableProps} // eslint-disable-line react/jsx-props-no-spreading
            {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
            ref={innerRef}
            className={classNames(styles.wrapper, className)}
          >
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <Card {...props} id={id} />
          </div>
        )}
      </Draggable>
    );
  },
);

DraggableCard.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  laneKey: PropTypes.string,
  className: PropTypes.string,
};

export default DraggableCard;
