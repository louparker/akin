import { useState, useEffect, useRef } from 'react';

/**
 * Detects when a post transitions from not-full to full during the current
 * session. Returns `showNotice=true` only on the transition — not on initial
 * load when the post is already full.
 */
export function useFullTransition(isFull: boolean | undefined): {
  showNotice: boolean;
  dismiss: () => void;
} {
  // null = data not yet received; boolean = recorded initial state
  const initialFullRef = useRef<boolean | null>(null);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (isFull === undefined) return;

    if (initialFullRef.current === null) {
      initialFullRef.current = isFull;
      return;
    }

    if (!initialFullRef.current && isFull) {
      setShowNotice(true);
    }
  }, [isFull]);

  return {
    showNotice,
    dismiss: () => setShowNotice(false),
  };
}
