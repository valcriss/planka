import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import { Gantt, Willow } from 'wx-react-gantt';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import 'wx-react-gantt/dist/gantt.css';
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
        const end = hasDates ? new Date(e.endDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

        return {
          id: String(e.id),
          text: e.name,
          type: 'task',
          start,
          end,
          duration: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
          progress: 0,
          lazy: false,
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

  const scales = useMemo(
    () => [
      { unit: 'month', step: 1, format: 'MMMM yyy' },
      { unit: 'day', step: 1, format: 'd' },
    ],
    [],
  );

  const links = useMemo(() => [], []);

  const handleAddClick = useCallback(() => {
    dispatch(entryActions.openAddEpicModal());
  }, [dispatch]);

  return (
    <div>
      <div className={Styles.actionBarContainer}>
        <div className={Styles.actionBar}>
          <Button onClick={handleAddClick} content={t('action.addEpic')} />
        </div>
        {modal && modal.type === 'ADD_EPIC' && <AddEpicModal />}
      </div>
      <div className={Styles.ganttContainer}>
        {tasks.length > 0 && (
          <div className={Styles.gantt}>
            <Willow>
              <Gantt tasks={tasks} links={links} scales={scales} />
            </Willow>
          </div>
        )}
        {tasks.length === 0 && <div className={Styles.noEpicsMessage}>{t('message.noEpics')}</div>}
      </div>
    </div>
  );
});

export default ProjectEpics;
