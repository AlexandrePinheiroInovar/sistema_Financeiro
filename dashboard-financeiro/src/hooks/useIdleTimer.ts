import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerProps {
  timeout: number; // tempo em milissegundos
  onIdle: () => void; // função a ser executada quando ficar inativo
  events?: string[]; // eventos que resetam o timer
}

export const useIdleTimer = ({
  timeout,
  onIdle,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
}: UseIdleTimerProps) => {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    timeoutId.current = setTimeout(() => {
      onIdle();
    }, timeout);
  }, [timeout, onIdle]);

  useEffect(() => {
    // Inicia o timer quando o hook é montado
    resetTimer();

    // Adiciona listeners para os eventos que resetam o timer
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Cleanup: remove listeners e limpa o timeout
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [resetTimer, events]);

  // Função para resetar manualmente o timer
  const resetIdleTimer = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return { resetIdleTimer };
};