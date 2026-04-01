import { useState, useEffect, useCallback } from "react";

const observers = new Map();
const visibilityCallbacks = new WeakMap();

const getObserver = (rootMargin) => {
  if (!observers.has(rootMargin)) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const callback = visibilityCallbacks.get(entry.target);
          if (callback) {
            callback(entry.isIntersecting);
          }
        }
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
  externalRef: externalReference = null,
} = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [node, setNode] = useState(null);

  const setReference = useCallback((element) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (typeof externalReference === "function") {
      externalReference(node);
    } else if (externalReference) {
      externalReference.current = node;
    }
  }, [externalReference, node]);

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

  return { isVisible, setRef: setReference };
};
