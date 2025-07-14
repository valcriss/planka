import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import AddEpicModal from '../AddEpicModal';
import EditEpicModal from '../EditEpicModal';
import Gantt from '../../common/Gantt';
import Styles from './ProjectEpics.module.scss';

const ProjectEpics = React.memo(() => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const modal = useSelector(selectors.selectCurrentModal);
  const { projectId } = useSelector(selectors.selectPath);

  const epics = useSelector((state) => {
    const ids = selectors.selectEpicIdsByProjectId(state, projectId) || [];
    return ids.map((id) => selectors.selectEpicById(state, id));
  });

  const sortedEpics = useMemo(() => [...epics].sort((a, b) => a.position - b.position), [epics]);

  const boardIds = useSelector(
    (state) => selectors.selectBoardIdsByProjectId(state, projectId) || [],
  );
  const boards = useSelector((state) => boardIds.map((id) => selectors.selectBoardById(state, id)));

  useEffect(() => {
    if (projectId) {
      dispatch(entryActions.fetchEpics(projectId));
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    boards.forEach((board) => {
      if (board && board.isFetching === null) {
        dispatch(entryActions.fetchBoard(board.id));
      }
    });
  }, [dispatch, boards]);

  const selectCardIdsByEpicId = useMemo(() => selectors.makeSelectCardIdsByEpicId(), []);
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const { tasks, epicMap } = useSelector((state) => {
    const result = [];
    const map = {};
    sortedEpics.forEach((e) => {
      result.push({
        id: `epic-${e.id}`,
        name: e.name,
        color: e.color,
        startDate: e.startDate ? new Date(e.startDate) : null,
        endDate: e.endDate ? new Date(e.endDate) : null,
        progress: 0,
      });
      const cardIds = selectCardIdsByEpicId(state, e.id) || [];
      cardIds.forEach((cardId) => {
        const card = selectCardById(state, cardId);
        result.push({
          id: `card-${card.id}`,
          name: card.name,
          color: e.color,
          // eslint-disable-next-line no-nested-ternary
          startDate: card.ganttStartDate
            ? new Date(card.ganttStartDate)
            : e.startDate
              ? new Date(e.startDate)
              : null,
          // eslint-disable-next-line no-nested-ternary
          endDate: card.ganttEndDate
            ? new Date(card.ganttEndDate)
            : e.endDate
              ? new Date(e.endDate)
              : null,
          progress: 0,
          isChild: true,
        });
        map[`card-${card.id}`] = e.id;
      });
    });
    return { tasks: result, epicMap: map };
  });

  const handleTaskChange = useCallback(
    (taskId, data) => {
      if (taskId.startsWith('epic-')) {
        const id = taskId.replace('epic-', '');
        dispatch(entryActions.updateEpic(id, data));
      } else if (taskId.startsWith('card-')) {
        const id = taskId.replace('card-', '');
        dispatch(
          entryActions.updateCard(id, {
            ganttStartDate: data.startDate,
            ganttEndDate: data.endDate,
          }),
        );
        const epicId = epicMap[taskId];
        if (epicId) {
          const epic = epics.find((e) => e.id === epicId);
          if (epic) {
            const update = {};
            if (!epic.startDate || data.startDate < new Date(epic.startDate)) {
              update.startDate = data.startDate;
            }
            if (!epic.endDate || data.endDate > new Date(epic.endDate)) {
              update.endDate = data.endDate;
            }
            if (Object.keys(update).length > 0) {
              dispatch(entryActions.updateEpic(epicId, update));
            }
          }
        }
      }
    },
    [dispatch, epicMap, epics],
  );

  const handleAddClick = useCallback(() => {
    dispatch(entryActions.openAddEpicModal());
  }, [dispatch]);

  const handleEpicClick = useCallback(
    (id) => {
      dispatch(entryActions.openEditEpicModal(id));
    },
    [dispatch],
  );

  const handleEpicReorder = useCallback(
    (id, index) => {
      dispatch(entryActions.moveEpic(id.replace('epic-', ''), index));
    },
    [dispatch],
  );

  return (
    <div>
      <div className={Styles.actionBarContainer}>
        <div className={Styles.actionBar}>
          <Button onClick={handleAddClick} content={t('action.addEpic')} />
        </div>
        {modal && modal.type === 'ADD_EPIC' && <AddEpicModal />}
        {modal && modal.type === 'EDIT_EPIC' && <EditEpicModal />}
      </div>
      <div className={Styles.ganttContainer}>
        {tasks.length > 0 && (
          <div className={Styles.gantt}>
            <Gantt
              tasks={tasks}
              onChange={handleTaskChange}
              onEpicClick={handleEpicClick}
              onReorder={handleEpicReorder}
            />
          </div>
        )}
        {tasks.length === 0 && <div className={Styles.noEpicsMessage}>{t('common.noEpics')}</div>}
      </div>
    </div>
  );
});

export default ProjectEpics;
