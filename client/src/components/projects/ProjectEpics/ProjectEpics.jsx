import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import { Gantt } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';

import AddEpicModal from '../AddEpicModal';
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

  useEffect(() => {
    if (projectId) {
      dispatch(entryActions.fetchEpics(projectId));
    }
  }, [dispatch, projectId]);

  const tasks = useMemo(
    () =>
      epics.map((e) => {
        const hasDates = e.startDate && e.endDate;
        const start = hasDates ? new Date(e.startDate) : new Date();
        const end = hasDates ? new Date(e.endDate) : new Date();

        return {
          id: String(e.id),
          name: e.name,
          type: 'task',
          start,
          end,
          progress: 0,
          isDisabled: false,
          styles: {
            backgroundColor: hasDates ? e.color : 'transparent',
            backgroundSelectedColor: hasDates ? e.color : 'transparent',
            progressColor: hasDates ? e.color : 'transparent',
            progressSelectedColor: hasDates ? e.color : 'transparent',
          },
        };
      }),
    [epics],
  );

  const handleAddClick = useCallback(() => {
    dispatch(entryActions.openAddEpicModal());
  }, [dispatch]);

  const handleDateChange = useCallback(
    (task) => {
      dispatch(
        entryActions.updateEpic(task.id, {
          startDate: task.start,
          endDate: task.end,
        }),
      );
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
      </div>
      <div className={Styles.ganttContainer}>
        {tasks.length > 0 && <Gantt tasks={tasks} onDateChange={handleDateChange} />}
      </div>
    </div>
  );
});

export default ProjectEpics;
