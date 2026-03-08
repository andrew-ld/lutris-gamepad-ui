import { useState, useEffect, useCallback } from "react";

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
  const [node, setNode] = useState(null);

  const setRef = useCallback(
    (element) => {
      setNode(element);

      if (typeof externalRef === "function") {
        externalRef(element);
      } else if (externalRef) {
        externalRef.current = element;
      }
    },
    [externalRef],
  );

  useEffect(() => {
    if (!node) return;

    const observer = getObserver(rootMargin);
    if (!observer) return;

    visibilityCallbacks.set(node, setIsVisible);
    observer.observe(node);

    return () => {
      visibilityCallbacks.delete(node);
      observer.unobserve(node);
    };
  }, [node, rootMargin]);

  return { isVisible, setRef };
};
