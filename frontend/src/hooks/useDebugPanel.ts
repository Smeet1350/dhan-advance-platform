import { useState, useEffect, useCallback } from 'react';

export function useDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleDebugPanel = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const closeDebugPanel = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Handle Ctrl+D hotkey
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        toggleDebugPanel();
      }
      
      // Also handle Escape key to close
      if (event.key === 'Escape' && isVisible) {
        closeDebugPanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleDebugPanel, closeDebugPanel, isVisible]);

  return {
    isVisible,
    toggleDebugPanel,
    closeDebugPanel
  };
}
