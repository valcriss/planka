import React from 'react';
import { useTranslation } from 'react-i18next';

const ProjectEpics = React.memo(() => {
  const [t] = useTranslation();

  return <h1>{t('common.epics', { context: 'title' })}</h1>;
});

export default ProjectEpics;
