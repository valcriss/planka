import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from 'semantic-ui-react';

import api, { socket } from '../../../api';
import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import UserAvatar from '../../users/UserAvatar';

import styles from './PlanningPoker.module.scss';

const isToEstimateList = (list) => {
  const normalizedName = (list.name || '').toLowerCase();

  return (
    list.slug === 'to-estimate' ||
    normalizedName.includes('estimate') ||
    normalizedName.includes('estimer')
  );
};

const isCardEstimated = (card) => {
  const storyPoints = Number(card.storyPoints);

  return Number.isFinite(storyPoints) && storyPoints > 0;
};

const getShortDescription = (description) => {
  if (!description) {
    return '';
  }

  return description.length <= 180 ? description : `${description.slice(0, 180)}...`;
};

const getVoteLabel = (value, t) => (value === 'coffee' ? t('common.planningPokerCoffee') : value);
const renderVoteCardValue = (value, t, className) => {
  if (value === 'coffee') {
    return (
      <img src="/img/coffee.png" alt={t('common.planningPokerCoffee')} className={className} />
    );
  }

  return getVoteLabel(value, t);
};

const getRemainingSeconds = (closingEndsAt) => {
  if (!closingEndsAt) {
    return 60;
  }

  const remainingMs = new Date(closingEndsAt).getTime() - Date.now();

  return Math.max(0, Math.ceil(remainingMs / 1000));
};

const PlanningPoker = React.memo(() => {
  const selectFiniteListIdsByBoardId = useMemo(
    () => selectors.makeSelectFiniteListIdsByBoardId(),
    [],
  );

  const [t] = useTranslation();
  const project = useSelector(selectors.selectCurrentProject);
  const board = useSelector(selectors.selectCurrentBoard);
  const currentUserId = useSelector(selectors.selectCurrentUserId);
  const accessToken = useSelector(selectors.selectAccessToken);
  const isProjectManager = useSelector(selectors.selectIsCurrentUserManagerForCurrentProject);
  const routerLocation = useSelector((state) => state.router.location);

  const listsOnBoard = useSelector((state) => {
    if (!board) {
      return [];
    }

    const listIds = selectFiniteListIdsByBoardId(state, board.id) || [];

    return listIds.map((listId) => selectors.selectListById(state, listId)).filter(Boolean);
  });

  const [session, setSession] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [selectedStoryPoints, setSelectedStoryPoints] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [actionError, setActionError] = useState(null);

  const isJoinedRef = useRef(false);

  const listIdFromQuery = useMemo(() => {
    const searchParams = new URLSearchParams((routerLocation && routerLocation.search) || '');

    return searchParams.get('listId');
  }, [routerLocation]);

  const [closingCountdown, setClosingCountdown] = useState(60);

  const defaultToEstimateList = useMemo(
    () => listsOnBoard.find((list) => isToEstimateList(list)) || null,
    [listsOnBoard],
  );

  const targetListId =
    (session && session.listId) ||
    listIdFromQuery ||
    (defaultToEstimateList && defaultToEstimateList.id);

  const listCards = useSelector((state) => {
    if (!targetListId) {
      return [];
    }

    const cardIds = selectors.selectCardIdsByListId(state, targetListId) || [];

    return cardIds.map((cardId) => selectors.selectCardById(state, cardId)).filter(Boolean);
  });

  const cardsById = useMemo(() => _.keyBy(listCards, 'id'), [listCards]);

  const cardsToEstimate = useMemo(() => {
    const excludedCardIds = new Set((session && session.excludedCardIds) || []);

    return listCards.filter((card) => !isCardEstimated(card) && !excludedCardIds.has(card.id));
  }, [listCards, session]);

  const activeCard = session && session.activeCardId ? cardsById[session.activeCardId] : null;

  const participants = useMemo(() => (session ? session.participants || [] : []), [session]);

  const participantByUserId = useMemo(() => _.keyBy(participants, 'userId'), [participants]);

  const participantIds = useMemo(() => {
    const ids = participants.map((participant) => participant.userId);

    if (currentUserId && !ids.includes(currentUserId)) {
      ids.push(currentUserId);
    }

    return ids;
  }, [currentUserId, participants]);

  const usersById = useSelector((state) => {
    const map = {};

    participantIds.forEach((id) => {
      map[id] = selectors.selectUserById(state, id);
    });

    return map;
  });

  const currentParticipant = participantByUserId[currentUserId];
  const currentUser = usersById[currentUserId];

  const isHost = !!session && session.hostUserId === currentUserId;
  const isClosing = !!session && session.phase === 'closing';
  const boardPath =
    project && board
      ? Paths.BOARDS.replace(':code', project.code).replace(':slug', board.slug)
      : null;

  const activeParticipants = useMemo(
    () => participants.filter((participant) => !participant.isObserver),
    [participants],
  );

  const stats = (session && session.voteStats) || null;

  useEffect(() => {
    if (!stats || _.isNil(stats.suggestedStoryPoints)) {
      setSelectedStoryPoints('');
      return;
    }

    setSelectedStoryPoints(String(stats.suggestedStoryPoints));
  }, [stats]);

  useEffect(() => {
    if (!isClosing) {
      return () => {};
    }

    setClosingCountdown(getRemainingSeconds(session.closingEndsAt));

    const intervalId = setInterval(() => {
      setClosingCountdown(getRemainingSeconds(session.closingEndsAt));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isClosing, session]);

  useEffect(() => {
    if (!isClosing || !boardPath) {
      return () => {};
    }

    const remainingMs = Math.max(
      0,
      new Date(session.closingEndsAt || Date.now()).getTime() - Date.now(),
    );

    const timeoutId = setTimeout(() => {
      window.location.assign(boardPath);
    }, remainingMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [boardPath, isClosing, session]);

  useEffect(() => {
    if (!project || !board || !accessToken) {
      return () => {};
    }

    let isCancelled = false;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const handleUpdate = ({ item }) => {
      if (isCancelled) {
        return;
      }

      setSession(item || null);

      if (!item) {
        setMyVote(null);
      }
    };

    const initialize = async () => {
      let shouldAttemptJoin = false;

      try {
        const state = await api.getPlanningPokerSession(project.id, { boardId: board.id }, headers);

        if (isCancelled) {
          return;
        }

        shouldAttemptJoin = !!state.item || !!targetListId;
      } catch {
        shouldAttemptJoin = !!targetListId;
      }

      if (!shouldAttemptJoin) {
        setSession(null);
        setMyVote(null);
        return;
      }

      try {
        const body = await api.joinPlanningPokerSession(
          project.id,
          {
            boardId: board.id,
            listId: targetListId,
          },
          headers,
        );

        if (isCancelled) {
          return;
        }

        isJoinedRef.current = true;
        setSession(body.item || null);
        setMyVote(body.myVote || null);
      } catch {
        if (!isCancelled) {
          setSession(null);
          setMyVote(null);
        }
      }
    };

    socket.on('planningPokerSessionUpdate', handleUpdate);

    initialize();

    return () => {
      isCancelled = true;
      socket.off('planningPokerSessionUpdate', handleUpdate);
      if (isJoinedRef.current) {
        api.leavePlanningPokerSession(project.id, undefined, headers).catch(() => {});
      }
      isJoinedRef.current = false;
    };
  }, [accessToken, board, project, targetListId]);

  const callWithHeaders = useCallback(
    async (requestFn, actionName) => {
      if (!project || !accessToken) {
        return;
      }

      try {
        const body = await requestFn({
          Authorization: `Bearer ${accessToken}`,
        });

        setSession(body.item || null);
        setMyVote(body.myVote || null);
        setActionError(null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[PlanningPoker] ${actionName || 'action'} failed`, error);

        setActionError(
          t('common.planningPokerActionFailed', {
            action: actionName || t('common.actions'),
          }),
        );
      }
    },
    [accessToken, project, t],
  );

  const handleBackClick = useCallback(() => {
    if (!boardPath) {
      return;
    }

    window.location.assign(boardPath);
  }, [boardPath]);

  const handleCloseSession = useCallback(() => {
    if (!project) {
      return;
    }

    callWithHeaders(
      (headers) => api.closePlanningPokerSession(project.id, headers),
      t('action.closeSession'),
    );
  }, [callWithHeaders, project, t]);

  const handleToggleObserver = useCallback(() => {
    if (!project || !session) {
      return;
    }

    const nextIsObserver = !(currentParticipant && currentParticipant.isObserver);

    callWithHeaders(
      (headers) =>
        api.setPlanningPokerObserver(
          project.id,
          {
            isObserver: nextIsObserver,
          },
          headers,
        ),
      t('action.becomeObserver'),
    );
  }, [callWithHeaders, currentParticipant, project, session, t]);

  const handleActivateStory = useCallback(
    (cardId) => {
      if (!project) {
        return;
      }

      callWithHeaders(
        (headers) => api.activatePlanningPokerStory(project.id, { cardId }, headers),
        t('action.activateStory'),
      );
    },
    [callWithHeaders, project, t],
  );

  const handleVote = useCallback(
    (value) => {
      if (!project || !session || session.phase !== 'voting' || isClosing) {
        return;
      }

      setMyVote(String(value));

      callWithHeaders(
        (headers) => api.votePlanningPoker(project.id, { value: String(value) }, headers),
        t('common.planningPoker_title'),
      );
    },
    [callWithHeaders, isClosing, project, session, t],
  );

  const handleFinishVote = useCallback(() => {
    if (!project) {
      return;
    }

    callWithHeaders(
      (headers) => api.finishPlanningPokerVote(project.id, headers),
      t('action.finishVote'),
    );
  }, [callWithHeaders, project, t]);

  const handleAssignStoryPoints = useCallback(() => {
    if (!project || selectedStoryPoints === '') {
      return;
    }

    const storyPoints = Number(selectedStoryPoints);

    if (!Number.isFinite(storyPoints)) {
      return;
    }

    callWithHeaders(
      (headers) =>
        api.assignPlanningPokerStoryPoints(
          project.id,
          {
            storyPoints,
          },
          headers,
        ),
      t('action.assignStoryPoints'),
    );
  }, [callWithHeaders, project, selectedStoryPoints, t]);

  const handleRestartVote = useCallback(() => {
    if (!project) {
      return;
    }

    callWithHeaders(
      (headers) => api.restartPlanningPokerVote(project.id, headers),
      t('action.restartVote'),
    );
  }, [callWithHeaders, project, t]);

  const handleSkipStory = useCallback(() => {
    if (!project) {
      return;
    }

    callWithHeaders(
      (headers) => api.skipPlanningPokerStory(project.id, headers),
      t('action.skipStory'),
    );
  }, [callWithHeaders, project, t]);

  const handleTransferHost = useCallback(
    (userId) => {
      if (!project) {
        return;
      }

      callWithHeaders(
        (headers) => api.transferPlanningPokerHost(project.id, { userId }, headers),
        t('action.transferHost'),
      );
    },
    [callWithHeaders, project, t],
  );

  const canVote =
    !!session &&
    session.phase === 'voting' &&
    !!currentParticipant &&
    !currentParticipant.isObserver &&
    !!activeCard &&
    !isClosing;

  const maxVoteCount = stats ? Math.max(...Object.values(stats.countsByValue || {}), 1) : 1;
  let activeStoryContent = (
    <div className={styles.noActiveStory}>{t('common.planningPokerNoActiveStory')}</div>
  );

  if (isClosing) {
    activeStoryContent = (
      <div className={styles.closingMessage}>
        {t('common.planningPokerClosing', {
          seconds: closingCountdown,
        })}
      </div>
    );
  } else if (activeCard) {
    activeStoryContent = (
      <>
        <div className={styles.activeStoryTitle}>{activeCard.name}</div>
        <div
          className={classNames(
            styles.activeStoryDescription,
            isDescriptionExpanded && styles.activeStoryDescriptionExpanded,
          )}
        >
          {activeCard.description || t('common.noDescription')}
        </div>
        {activeCard.description && (
          <button
            type="button"
            className={styles.toggleDescriptionButton}
            onClick={() => setIsDescriptionExpanded((value) => !value)}
          >
            {isDescriptionExpanded ? t('action.showLess') : t('action.showMore')}
          </button>
        )}
        {isHost && session.phase === 'voting' && (
          <Button positive onClick={handleFinishVote}>
            {t('action.finishVote')}
          </Button>
        )}
      </>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerActions}>
          <Button className={styles.backButton} onClick={handleBackClick}>
            <Icon name="arrow left" />
            {t('action.returnToBoard')}
          </Button>
          {isHost && session && !isClosing && (
            <Button className={styles.closeSessionButton} onClick={handleCloseSession}>
              <Icon name="hourglass end" />
              {t('action.closeSession')}
            </Button>
          )}
        </div>
        <div className={styles.title}>{t('common.planningPoker_title')}</div>
      </div>

      {actionError && <div className={styles.errorBanner}>{actionError}</div>}

      {!session ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>{t('common.planningPokerNoSession_title')}</div>
          <div className={styles.emptyText}>
            {isProjectManager
              ? t('common.planningPokerNoSessionManager')
              : t('common.planningPokerNoSessionMember')}
          </div>
        </div>
      ) : (
        <div className={styles.columns}>
          <div className={styles.leftColumn}>
            <div className={styles.currentUserCard}>
              <div className={styles.currentUserHeader}>{t('common.you')}</div>
              <div className={styles.currentUserBody}>
                <UserAvatar id={currentUserId} />
                <div className={styles.currentUserName}>
                  {currentUser ? currentUser.name : currentUserId}
                </div>
              </div>
              <Button size="tiny" onClick={handleToggleObserver}>
                {currentParticipant && currentParticipant.isObserver
                  ? t('action.becomeVoter')
                  : t('action.becomeObserver')}
              </Button>
            </div>

            <div className={styles.participantsBox}>
              <div className={styles.boxTitle}>{t('common.connectedUsers')}</div>
              {participants.map((participant) => {
                const user = usersById[participant.userId];
                const isParticipantHost = participant.userId === session.hostUserId;

                return (
                  <div key={participant.userId} className={styles.participantRow}>
                    <div className={styles.participantMain}>
                      <div className={styles.avatarWrap}>
                        {isParticipantHost && <Icon name="chess king" className={styles.crown} />}
                        <UserAvatar id={participant.userId} size="small" />
                      </div>
                      <div className={styles.participantInfo}>
                        <div className={styles.participantName}>
                          {user ? user.name : participant.userId}
                        </div>
                        <div className={styles.participantStatus}>
                          {participant.isObserver ? t('common.observer') : t('common.voter')}
                        </div>
                      </div>
                    </div>
                    {isHost && !isParticipantHost && (
                      <Button
                        size="mini"
                        basic
                        onClick={() => handleTransferHost(participant.userId)}
                      >
                        {t('action.transferHost')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.centerColumn}>
            <div className={styles.activeStoryBox}>{activeStoryContent}</div>

            <div className={styles.votersBoard}>
              {activeParticipants.map((participant) => {
                const user = usersById[participant.userId];
                const voteValue =
                  session.revealedVotes && session.revealedVotes[participant.userId];
                const hasVoted = (session.votedUserIds || []).includes(participant.userId);
                let voteDisplay = '';

                if (session.phase === 'revealed') {
                  voteDisplay = voteValue
                    ? renderVoteCardValue(voteValue, t, styles.voteCoffeeImage)
                    : '?';
                } else if (hasVoted) {
                  voteDisplay = '*';
                }

                return (
                  <div key={participant.userId} className={styles.voterItem}>
                    <div className={styles.voteCard}>{voteDisplay}</div>
                    <UserAvatar id={participant.userId} size="small" />
                    <div className={styles.voterName}>{user ? user.name : participant.userId}</div>
                  </div>
                );
              })}
            </div>

            {session.phase === 'revealed' ? (
              <div className={styles.resultsBox}>
                <div className={styles.resultBars}>
                  {session.allowedVoteValues.map((value) => {
                    const count = (stats && stats.countsByValue && stats.countsByValue[value]) || 0;
                    const width = `${Math.round((count / maxVoteCount) * 100)}%`;

                    return (
                      <div key={value} className={styles.resultBarRow}>
                        <div className={styles.resultLabel}>{getVoteLabel(value, t)}</div>
                        <div className={styles.resultBarTrack}>
                          <div className={styles.resultBarFill} style={{ width }} />
                        </div>
                        <div className={styles.resultCount}>{count}</div>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.resultSummary}>
                  <span>{`${t('common.lowest')}: ${_.isNil(stats.minimum) ? '-' : stats.minimum}`}</span>
                  <span>{`${t('common.highest')}: ${_.isNil(stats.maximum) ? '-' : stats.maximum}`}</span>
                  <span>{`${t('common.average')}: ${_.isNil(stats.average) ? '-' : Number(stats.average.toFixed(2))}`}</span>
                </div>

                {isHost && !isClosing && (
                  <div className={styles.hostActions}>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={selectedStoryPoints}
                      className={styles.storyPointInput}
                      onChange={(event) => setSelectedStoryPoints(event.target.value)}
                    />
                    <Button positive onClick={handleAssignStoryPoints}>
                      {t('action.assignStoryPoints')}
                    </Button>
                    <Button onClick={handleRestartVote}>{t('action.restartVote')}</Button>
                    <Button onClick={handleSkipStory}>{t('action.skipStory')}</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.voteValuesBox}>
                {session.allowedVoteValues.map((value) => (
                  <button
                    type="button"
                    key={value}
                    disabled={!canVote}
                    className={classNames(
                      styles.voteValue,
                      String(myVote) === String(value) && styles.voteValueActive,
                    )}
                    onClick={() => handleVote(value)}
                  >
                    {renderVoteCardValue(value, t, styles.voteCoffeeImage)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.boxTitle}>{t('common.storiesToEstimate')}</div>
            <div className={styles.storyList}>
              {cardsToEstimate.map((card) => {
                const isActive = session.activeCardId === card.id;

                return (
                  <div
                    key={card.id}
                    className={classNames(styles.storyItem, isActive && styles.storyItemActive)}
                  >
                    <div className={styles.storyName}>{card.name}</div>
                    <div className={styles.storyDescription}>
                      {getShortDescription(card.description)}
                    </div>
                    {isHost && !isClosing && (
                      <Button
                        size="tiny"
                        disabled={isActive || isClosing}
                        onClick={() => handleActivateStory(card.id)}
                      >
                        {isActive ? t('common.active') : t('action.activateStory')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default PlanningPoker;
