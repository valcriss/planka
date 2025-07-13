import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import AddEpicModal from '../AddEpicModal';
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

  useEffect(() => {
    if (projectId) {
      dispatch(entryActions.fetchEpics(projectId));
    }
  }, [dispatch, projectId]);

  const tasks = useMemo(
    () =>
      epics.map((e) => ({
        id: e.id,
        name: e.name,
        color: e.color,
        startDate: e.startDate ? new Date(e.startDate) : null,
        endDate: e.endDate ? new Date(e.endDate) : null,
        progress: 0,
      })),
    [epics],
  );

  const handleTaskChange = useCallback(
    (id, data) => {
      dispatch(entryActions.updateEpic(id, data));
    },
    [dispatch],
  );

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
            <Gantt tasks={tasks} onChange={handleTaskChange} />
          </div>
        )}
        {tasks.length === 0 && <div className={Styles.noEpicsMessage}>{t('message.noEpics')}</div>}
      </div>
    </div>
  );
});

export default ProjectEpics;
