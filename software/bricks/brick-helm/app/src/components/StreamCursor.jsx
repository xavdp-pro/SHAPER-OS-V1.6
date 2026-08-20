/** Curseur inline style ChatGPT / IDE. */
export default function StreamCursor({ variant = 'emerald', active = true }) {
  return (
    <span
      className={`stream-cursor stream-cursor-${variant} ${active ? 'stream-cursor-active' : ''}`}
      aria-hidden
    />
  );
}
