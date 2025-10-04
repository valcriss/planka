/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { ResizeObserver } from '@juggle/resize-observer';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Popup as SemanticUIPopup } from 'semantic-ui-react';

import styles from './Popup.module.css';

export default (Step, { position, onOpen, onClose } = {}) => {
  return useMemo(() => {
    const Popup = React.memo(({ children, ...stepProps }) => {
      const [isOpened, setIsOpened] = useState(false);

      const wrapperRef = useRef(null);
      const resizeObserverRef = useRef(null);
      const [triggerNode, setTriggerNode] = useState(null);
      const latestOnOpenRef = useRef(onOpen);
      const latestOnCloseRef = useRef(onClose);
      latestOnOpenRef.current = onOpen;
      latestOnCloseRef.current = onClose;

      const handleClose = useCallback(() => {
        setIsOpened(false);

        if (latestOnCloseRef.current) {
          latestOnCloseRef.current();
        }
      }, []);

      const handleMouseDown = useCallback((event) => {
        event.stopPropagation();
      }, []);

      const handleClick = useCallback((event) => {
        event.stopPropagation();
      }, []);

      const handleTriggerClick = useCallback(
        (event) => {
          event.stopPropagation();

          const { onClick } = children.props || {};

          if (onClick) {
            onClick(event);
          }

          setIsOpened((prevValue) => {
            if (prevValue) {
              if (latestOnCloseRef.current) {
                latestOnCloseRef.current();
              }

              return false;
            }

            if (latestOnOpenRef.current) {
              latestOnOpenRef.current();
            }

            return true;
          });
        },
        [children],
      );

      const handleTriggerRef = useCallback(
        (node) => {
          setTriggerNode(node);

          const { ref } = children;

          if (typeof ref === 'function') {
            ref(node);
          } else if (ref && typeof ref === 'object') {
            ref.current = node;
          }
        },
        [children],
      );

      const handleContentRef = useCallback((element) => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }

        if (!element) {
          resizeObserverRef.current = null;
          return;
        }

        resizeObserverRef.current = new ResizeObserver(() => {
          if (resizeObserverRef.current.isInitial) {
            resizeObserverRef.current.isInitial = false;
            return;
          }

          wrapperRef.current.positionUpdate();
        });

        resizeObserverRef.current.isInitial = true;
        resizeObserverRef.current.observe(element);
      }, []);

      const trigger = React.cloneElement(children, {
        onClick: handleTriggerClick,
        ref: handleTriggerRef,
      });

      return (
        <>
          {trigger}
          {triggerNode && (
            <SemanticUIPopup
              basic
              wide
              ref={wrapperRef}
              context={triggerNode}
              open={isOpened}
              position={position || 'bottom left'}
              popperModifiers={[
                {
                  name: 'preventOverflow',
                  enabled: true,
                  options: {
                    altAxis: true,
                    padding: 20,
                  },
                },
              ]}
              className={styles.wrapper}
              onClose={handleClose}
              onUnmount={onClose}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
            >
              <div ref={handleContentRef}>
                <Button icon="close" onClick={handleClose} className={styles.closeButton} />
                {/* eslint-disable-next-line react/jsx-props-no-spreading */}
                <Step {...stepProps} onClose={handleClose} />
              </div>
            </SemanticUIPopup>
          )}
        </>
      );
    });

    Popup.propTypes = {
      children: PropTypes.node.isRequired,
    };

    return Popup;
  }, [position, onOpen, onClose]);
};
