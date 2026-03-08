import { useState, useEffect, useRef, useCallback } from "react";

const observers = new Map();
const visibilityCallbacks = new WeakMap();

const getObserver = (rootMargin) => {
  if (!observers.has(rootMargin)) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const callback = visibilityCallbacks.get(entry.target);
          if (callback) {
            callback(entry.isIntersecting);
          }
        });
      },
      { rootMargin },
    );
    observers.set(rootMargin, observer);
  }
  return observers.get(rootMargin);
};

/**
 * @param {Object} options
 * @param {string} [options.rootMargin="800px"]
 * @param {React.Ref} [options.externalRef=null]
 * @returns {{ isVisible: boolean, setRef: function }}
 */
export const useVisibilityObserver = ({
  rootMargin = "800px",
  externalRef = null,
} = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const localRef = useRef(null);

  const setRef = useCallback(
    (node) => {
      localRef.current = node;
      if (typeof externalRef === "function") {
        externalRef(node);
      } else if (externalRef) {
        externalRef.current = node;
      }
    },
    [externalRef],
  );

  useEffect(() => {
    const node = localRef.current;
    if (!node) return;

    const observer = getObserver(rootMargin);

    visibilityCallbacks.set(node, setIsVisible);
    observer.observe(node);

    return () => {
      visibilityCallbacks.delete(node);
      observer.unobserve(node);
    };
  }, [rootMargin]);

  return { isVisible, setRef };
};
