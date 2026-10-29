export const HELP_LINES = [
  "GHOST spreads one hop each wave, only across open vulnerable links.",
  "Orange is the next hop. Shields must never turn red. AT RISK means a shielded system falls if you do nothing.",
  "Cyan patched links do not spread GHOST. Service lamps follow those links. If a lamp goes red, restore the path.",
  "Later floors give you a few switches. Restore one to spend it elsewhere. Click a system to trace how GHOST could reach it.",
  "WASD or arrows select a link. E or Space cuts it. Enter runs the wave. H hints. R restarts. Esc pauses.",
] as const;

export function HelpCard() {
  return (
    <div className="help-card">
      <p className="kicker">NIGHT AUDIT</p>
      <h2>HOW A NIGHT SHIFT WORKS</h2>
      <ol>
        {HELP_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
