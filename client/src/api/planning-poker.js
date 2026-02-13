import socket from './socket';

const getPlanningPokerSession = (projectId, data, headers) =>
  socket.get(`/projects/${projectId}/planning-poker/session`, data, headers);

const joinPlanningPokerSession = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session`, data, headers);

const leavePlanningPokerSession = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/leave`, data, headers);

const setPlanningPokerObserver = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/observer`, data, headers);

const activatePlanningPokerStory = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/activate-story`, data, headers);

const votePlanningPoker = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/vote`, data, headers);

const finishPlanningPokerVote = (projectId, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/finish-vote`, undefined, headers);

const assignPlanningPokerStoryPoints = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/assign-story-points`, data, headers);

const restartPlanningPokerVote = (projectId, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/restart-vote`, undefined, headers);

const skipPlanningPokerStory = (projectId, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/skip-story`, undefined, headers);

const closePlanningPokerSession = (projectId, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/close`, undefined, headers);

const transferPlanningPokerHost = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/planning-poker/session/transfer-host`, data, headers);

export default {
  getPlanningPokerSession,
  joinPlanningPokerSession,
  leavePlanningPokerSession,
  setPlanningPokerObserver,
  activatePlanningPokerStory,
  votePlanningPoker,
  finishPlanningPokerVote,
  assignPlanningPokerStoryPoints,
  restartPlanningPokerVote,
  skipPlanningPokerStory,
  closePlanningPokerSession,
  transferPlanningPokerHost,
};
