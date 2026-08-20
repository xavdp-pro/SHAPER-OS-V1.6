import { useEffect, useRef, useState } from 'react';

/**
 * Révèle le texte progressivement pendant le stream (effet ChatGPT/Claude).
 * - petits deltas : affichage immédiat
 * - gros blocs CLI : rattrapage fluide caractère par caractère
 */
export function useTypewriterReveal(targetText, streaming, {
  minCps = 220,
  maxCps = 1400,
} = {}) {
  const [visible, setVisible] = useState('');
  const visibleRef = useRef('');
  const targetRef = useRef('');
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  targetRef.current = String(targetText || '');

  useEffect(() => {
    const target = String(targetText || '');

    if (!streaming) {
      visibleRef.current = target;
      setVisible(target);
      lastTsRef.current = 0;
      return undefined;
    }

    const frame = (ts) => {
      const full = targetRef.current;
      let cur = visibleRef.current;
      const backlog = full.length - cur.length;

      if (backlog > 0) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dt = Math.min(0.12, (ts - lastTsRef.current) / 1000);
        lastTsRef.current = ts;

        let step;
        if (backlog <= 3) {
          step = backlog;
        } else {
          const cps = Math.min(maxCps, Math.max(minCps, minCps + backlog * 12));
          step = Math.max(1, Math.ceil(cps * dt));
        }

        cur = full.slice(0, Math.min(full.length, cur.length + step));
        if (cur !== visibleRef.current) {
          visibleRef.current = cur;
          setVisible(cur);
        }
      }

      if (streaming || visibleRef.current.length < targetRef.current.length) {
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [targetText, streaming, minCps, maxCps]);

  const behind = streaming && visible.length < String(targetText || '').length;
  return { visible, behind };
}
