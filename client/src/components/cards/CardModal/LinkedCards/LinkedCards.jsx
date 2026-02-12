/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { dequal } from 'dequal';
import { useTranslation } from 'react-i18next';
import { Button, Input, Menu, Modal, Icon } from 'semantic-ui-react';

import entryActions from '../../../../entry-actions';
import selectors from '../../../../selectors';
import { usePrevious } from '../../../../lib/hooks';
import {
  CardLinkCreatableTypes,
  CardLinkTypeTranslationKeys,
  CardLinkTypeCreationTranslationKeys,
  CardLinkTypes,
} from '../../../../constants/Enums';

import LinkedCardItem from './LinkedCardItem';
import styles from './LinkedCards.module.scss';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_IN_MS = 250;

const LinkedCards = React.memo(({ canEdit = false, className = null, headerClassName }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [searchValue, setSearchValue] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [type, setType] = useState(CardLinkTypes.RELATED);
  const [typeDropdownWidth, setTypeDropdownWidth] = useState(null);
  const [hoveredResultId, setHoveredResultId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const typeLabelRef = useRef(null);
  const suppressNextSearchRef = useRef(false);
  const formFieldRef = useRef(null);
  const [portalMenuPos, setPortalMenuPos] = useState(null);
  const typeTriggerRef = useRef(null);
  const typeMenuRef = useRef(null);

  const card = useSelector(selectors.selectCurrentCard);
  const board = useSelector(selectors.selectCurrentBoard);

  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
  const selectProjectById = useMemo(() => selectors.makeSelectProjectById(), []);

  const outgoingCardLinks = useSelector(
    (state) => selectors.selectOutgoingCardLinksByCardId(state, card.id),
    shallowEqual,
  );
  const incomingCardLinks = useSelector(
    (state) => selectors.selectIncomingCardLinksByCardId(state, card.id),
    shallowEqual,
  );

  const cardLinks = useMemo(
    () => [...outgoingCardLinks, ...incomingCardLinks],
    [outgoingCardLinks, incomingCardLinks],
  );

  // deletePendingMap is defined later; we'll derive active lists after it's available

  const cardNamesById = useSelector(selectors.selectCardNamesById, shallowEqual);

  const selectSearchData = useMemo(
    () => (state) => {
      const nextSearchState = selectors.selectCardLinkSearchByCardId(state, card.id);
      const cards = (nextSearchState.cardIds || [])
        .map((id) => selectCardById(state, id))
        .filter(Boolean)
        .map((cardItem) => {
          const boardItem = cardItem.boardId ? selectBoardById(state, cardItem.boardId) : null;

          return {
            ...cardItem,
            list: cardItem.listId ? selectListById(state, cardItem.listId) : null,
            board: boardItem,
            project: boardItem ? selectProjectById(state, boardItem.projectId) : null,
          };
        });

      return {
        searchState: nextSearchState,
        searchResults: cards,
      };
    },
    [card.id, selectBoardById, selectCardById, selectListById, selectProjectById],
  );

  const { searchState, searchResults } = useSelector(selectSearchData, dequal);

  const isCreatePending = useSelector((state) =>
    selectors.selectIsCardLinkCreateInProgressForCardId(state, card.id),
  );

  const deletePendingMap = useSelector(selectors.selectCardLinkDeletePendingMap, shallowEqual);
  const previousIsCreatePending = usePrevious(isCreatePending);

  // Exclude links that are pending deletion so user can immediately re-create with a different type
  const activeCardLinks = useMemo(
    () => cardLinks.filter((l) => !deletePendingMap[l.id]),
    [cardLinks, deletePendingMap],
  );
  const activeLinkedCardIds = useMemo(
    () => new Set(activeCardLinks.map((item) => item.linkedCardId)),
    [activeCardLinks],
  );

  useEffect(() => {
    if (previousIsCreatePending && !isCreatePending) {
      setSearchValue('');
      setSelectedCardId(null);
      // Fermer automatiquement la modal après création réussie
      setIsAddModalOpen(false);
    }
  }, [isCreatePending, previousIsCreatePending]);

  useEffect(() => {
    setSearchValue('');
    setSelectedCardId(null);
  }, [card.id]);

  useEffect(() => {
    if (!canEdit) {
      return undefined;
    }

    if (suppressNextSearchRef.current) {
      // Skip one cycle after a manual selection so menu doesn't reopen
      suppressNextSearchRef.current = false;
      return undefined;
    }

    const trimmedSearch = searchValue.trim();

    if (trimmedSearch.length < MIN_SEARCH_LENGTH) {
      setIsMenuOpen(false);
      return undefined;
    }

    setIsMenuOpen(true);

    const handle = setTimeout(() => {
      dispatch(entryActions.searchCardsForLink(board.id, card.id, trimmedSearch));
    }, SEARCH_DEBOUNCE_IN_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [dispatch, board.id, card.id, searchValue, canEdit]);

  const handleSearchChange = useCallback((event, { value }) => {
    setSearchValue(value);
    setSelectedCardId(null);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchValue.trim().length >= MIN_SEARCH_LENGTH) {
      setIsMenuOpen(true);
    }
  }, [searchValue]);

  const handleSearchBlur = useCallback(() => {
    setTimeout(() => {
      setIsMenuOpen(false);
    }, 100);
  }, []);

  const handleResultSelect = useCallback((cardId, name) => {
    suppressNextSearchRef.current = true;
    setSelectedCardId(cardId);
    setSearchValue(name);
    setIsMenuOpen(false);
  }, []);

  const handleCustomTypeSelect = useCallback((value) => {
    setType(value);
    setIsTypeMenuOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCardId || selectedCardId === card.id || isCreatePending) {
      return;
    }

    dispatch(entryActions.createCardLink(card.id, selectedCardId, type));
  }, [dispatch, card.id, selectedCardId, type, isCreatePending]);

  const handleFormSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const handleRemove = useCallback(
    (cardLinkId) => {
      dispatch(entryActions.deleteCardLink(cardLinkId));
    },
    [dispatch],
  );

  const filteredResults = useMemo(() => {
    if (!canEdit) {
      return [];
    }

    return searchResults.filter(
      (cardItem) => cardItem.id !== card.id && !activeLinkedCardIds.has(cardItem.id),
    );
  }, [searchResults, card.id, activeLinkedCardIds, canEdit]);

  const typeOptions = useMemo(
    () =>
      CardLinkCreatableTypes.map((value) => ({
        key: value,
        value,
        text: (() => {
          const creationKey = CardLinkTypeCreationTranslationKeys[value];
          const translated = t(creationKey);
          return translated === creationKey ? t(CardLinkTypeTranslationKeys[value]) : translated;
        })(),
        // Provide original short label for possible tooltip usage later
        original: t(CardLinkTypeTranslationKeys[value]),
      })),
    [t],
  );

  // Measure trigger width based on longest translated option (includes padding + icon)
  useEffect(() => {
    if (!typeTriggerRef.current || !typeLabelRef.current) return;
    const longest = typeOptions.reduce((acc, o) => (o.text.length > acc.length ? o.text : acc), '');
    if (!longest) return;
    const labelEl = typeLabelRef.current;
    const original = labelEl.textContent;
    labelEl.textContent = longest;
    // Force reflow then measure
    const width = typeTriggerRef.current.offsetWidth;
    labelEl.textContent = original;
    setTypeDropdownWidth(Math.max(300, width));
  }, [typeOptions]);

  const isSubmitDisabled =
    !selectedCardId ||
    selectedCardId === card.id ||
    activeLinkedCardIds.has(selectedCardId) ||
    isCreatePending;

  // const typeMenuLabel = t('common.type'); // not used in custom trigger
  // Duplicate/inverse detection placed after we have cardLinks and selectedCardId
  // existingLink logic removed; duplicate warning no longer displayed in current UI variant
  const removeLabel = t('action.remove');
  const searchPlaceholder = t('common.searchCards');
  const noResultsLabel = t('common.noResults');
  const noLinkedCardsLabel = t('common.noLinkedCards');
  const unnamedCardLabel = t('common.unnamedCard');
  const addLinkedCardLabel = t('action.addLinkedCard');
  const addLinkedCardTitle = t('action.addLinkedCardTitle');
  const linkedCardsTitle = t('common.linkedCards');

  // Reset form state when modal closes
  useEffect(() => {
    if (!isAddModalOpen) {
      setSearchValue('');
      setSelectedCardId(null);
      setIsMenuOpen(false);
    }
  }, [isAddModalOpen]);

  // Recalculate portal menu position when needed
  useEffect(() => {
    if (!(isAddModalOpen && isMenuOpen && formFieldRef.current)) {
      setPortalMenuPos(null);
      return () => {};
    }
    const calc = () => {
      if (!formFieldRef.current) return;
      const rect = formFieldRef.current.getBoundingClientRect();
      setPortalMenuPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [isAddModalOpen, isMenuOpen, searchValue, filteredResults.length]);

  // Close type menu on outside click or Escape
  useEffect(() => {
    const handleDown = (e) => {
      if (
        isTypeMenuOpen &&
        !(
          (typeTriggerRef.current && typeTriggerRef.current.contains(e.target)) ||
          (typeMenuRef.current && typeMenuRef.current.contains(e.target))
        )
      ) {
        setIsTypeMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (isTypeMenuOpen && e.key === 'Escape') setIsTypeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDown, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleDown, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [isTypeMenuOpen]);

  return (
    <div className={classNames(styles.wrapper, className)}>
      <div className={classNames(headerClassName, styles.header)}>
        <span className={styles.headerTitle}>{linkedCardsTitle}</span>
        {canEdit && (
          <Button
            icon
            size="mini"
            className={styles.addButton}
            aria-label={addLinkedCardLabel}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Icon name="plus" />
          </Button>
        )}
      </div>
      {cardLinks.length > 0 ? (
        <div className={styles.list}>
          {cardLinks.map((cardLink) => {
            const cardName = cardNamesById[cardLink.linkedCardId];
            const typeLabel = t(CardLinkTypeTranslationKeys[cardLink.type]);
            const isRemoving = Boolean(deletePendingMap[cardLink.id]);

            return (
              <LinkedCardItem
                key={cardLink.id}
                cardLinkId={cardLink.id}
                linkedCardId={cardLink.linkedCardId}
                name={cardName}
                typeLabel={typeLabel}
                type={cardLink.type}
                canEdit={canEdit}
                onRemove={handleRemove}
                isRemoving={isRemoving}
                removeLabel={removeLabel}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>{noLinkedCardsLabel}</div>
      )}
      {canEdit && (
        <Modal
          open={isAddModalOpen}
          size="small"
          closeIcon
          onClose={() => setIsAddModalOpen(false)}
          onUnmount={() => {
            // Ensure cleanup if semantic UI unmounts modal
            setIsMenuOpen(false);
          }}
        >
          <Modal.Header>{addLinkedCardTitle}</Modal.Header>
          <Modal.Content scrolling>
            <form className={styles.form} onSubmit={handleFormSubmit}>
              {/* Hidden measurement no longer required since we mutate trigger for measurement */}
              <div className={styles.typeSelectorWrapper}>
                <div
                  ref={typeTriggerRef}
                  className={classNames(styles.typeDropdown, styles.typeDropdownTrigger, {
                    [styles.typeDropdownOpen]: isTypeMenuOpen,
                  })}
                  role="button"
                  tabIndex={0}
                  aria-haspopup="listbox"
                  aria-expanded={isTypeMenuOpen}
                  onClick={() => setIsTypeMenuOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsTypeMenuOpen((v) => !v);
                    }
                    if (e.key === 'Escape') setIsTypeMenuOpen(false);
                  }}
                  style={typeDropdownWidth ? { width: typeDropdownWidth } : undefined}
                >
                  <span ref={typeLabelRef} className={styles.typeDropdownLabel}>
                    {typeOptions.find((o) => o.value === type)?.text}
                  </span>
                  <Icon name={isTypeMenuOpen ? 'angle up' : 'angle down'} />
                </div>
              </div>
              <div className={styles.formField} ref={formFieldRef}>
                <Input
                  fluid
                  value={searchValue}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  placeholder={searchPlaceholder}
                  loading={searchState.isFetching}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                positive
                content={addLinkedCardLabel}
                disabled={isSubmitDisabled}
                loading={isCreatePending}
              />
            </form>
          </Modal.Content>
        </Modal>
      )}
      {/* Portal menu rendering when inside modal */}
      {isAddModalOpen &&
        portalMenuPos &&
        isMenuOpen &&
        createPortal(
          <div
            style={{
              position: 'absolute',
              top: portalMenuPos.top,
              left: portalMenuPos.left,
              width: portalMenuPos.width,
              zIndex: 3000,
            }}
          >
            {filteredResults.length > 0 ? (
              <Menu secondary vertical fluid className={styles.searchMenu}>
                {filteredResults.map((cardItem) => (
                  <Menu.Item
                    key={cardItem.id}
                    className={classNames(styles.searchMenuItem, {
                      [styles.searchMenuItemActive]: hoveredResultId === cardItem.id,
                    })}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleResultSelect(cardItem.id, cardItem.name || unnamedCardLabel);
                    }}
                    onClick={() => {
                      if (!suppressNextSearchRef.current) {
                        handleResultSelect(cardItem.id, cardItem.name || unnamedCardLabel);
                      }
                    }}
                    onMouseEnter={() => setHoveredResultId(cardItem.id)}
                    onMouseLeave={() =>
                      setHoveredResultId((prev) => (prev === cardItem.id ? null : prev))
                    }
                    onFocus={() => setHoveredResultId(cardItem.id)}
                    onBlur={() =>
                      setHoveredResultId((prev) => (prev === cardItem.id ? null : prev))
                    }
                  >
                    <div className={styles.menuItemPrimary}>
                      {cardItem.name || unnamedCardLabel}
                      {cardItem.project && (
                        <span className={styles.menuItemCode}>
                          {` ${cardItem.project.code}-${cardItem.number}`}
                        </span>
                      )}
                    </div>
                    {(cardItem.project || cardItem.board || cardItem.list) && (
                      <div className={styles.menuItemSecondary}>
                        {cardItem.project?.name || ''}
                        {cardItem.board?.name ? ` \u2022 ${cardItem.board.name}` : ''}
                        {cardItem.list?.name ? ` \u2022 ${cardItem.list.name}` : ''}
                      </div>
                    )}
                  </Menu.Item>
                ))}
              </Menu>
            ) : (
              !searchState.isFetching && (
                <Menu secondary vertical fluid className={styles.searchMenu}>
                  <Menu.Item disabled>{noResultsLabel}</Menu.Item>
                </Menu>
              )
            )}
          </div>,
          document.body,
        )}
      {isAddModalOpen &&
        isTypeMenuOpen &&
        typeTriggerRef?.current &&
        createPortal(
          <div
            ref={typeMenuRef}
            style={{
              position: 'absolute',
              top: typeTriggerRef.current.getBoundingClientRect().bottom + window.scrollY,
              left: typeTriggerRef.current.getBoundingClientRect().left + window.scrollX,
              minWidth: typeTriggerRef.current.getBoundingClientRect().width,
              zIndex: 3000,
            }}
          >
            <Menu
              secondary
              vertical
              fluid
              className={classNames(styles.searchMenu, styles.typeMenu)}
            >
              {typeOptions.map((opt) => (
                <Menu.Item
                  key={opt.value}
                  active={opt.value === type}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCustomTypeSelect(opt.value);
                  }}
                  onClick={() => handleCustomTypeSelect(opt.value)}
                >
                  {opt.text}
                </Menu.Item>
              ))}
            </Menu>
          </div>,
          document.body,
        )}
    </div>
  );
});

LinkedCards.propTypes = {
  canEdit: PropTypes.bool,
  className: PropTypes.string,
  headerClassName: PropTypes.string.isRequired,
};

export default LinkedCards;
