import { useEffect, useState } from "react";
import type { NodeKind } from "../game/types";

export function KindIcon({ kind }: { kind: NodeKind }) {
  return (
    <svg className="kind-icon" viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
      {kind === "laptop" && (
        <>
          <rect x="5" y="7" width="22" height="14" fill="currentColor" />
          <rect x="7" y="9" width="18" height="10" fill="#07140c" />
          <rect x="3" y="22" width="26" height="3" fill="currentColor" />
        </>
      )}
      {kind === "pc" && (
        <>
          <rect x="7" y="4" width="18" height="16" fill="currentColor" />
          <rect x="9" y="6" width="14" height="11" fill="#07140c" />
          <rect x="14" y="20" width="4" height="4" fill="currentColor" />
          <rect x="9" y="24" width="14" height="3" fill="currentColor" />
        </>
      )}
      {kind === "server" && (
        <>
          <rect x="8" y="3" width="16" height="26" fill="currentColor" />
          <rect x="10" y="6" width="12" height="4" fill="#07140c" />
          <rect x="10" y="13" width="12" height="4" fill="#07140c" />
          <rect x="10" y="20" width="12" height="4" fill="#07140c" />
          <rect x="11" y="7" width="2" height="2" fill="#ffb020" />
        </>
      )}
      {kind === "camera" && (
        <>
          <rect x="4" y="12" width="16" height="10" fill="currentColor" />
          <rect x="18" y="14" width="8" height="6" fill="currentColor" />
          <rect x="8" y="15" width="6" height="4" fill="#07140c" />
          <rect x="14" y="22" width="3" height="6" fill="currentColor" />
        </>
      )}
      {kind === "payment" && (
        <>
          <rect x="6" y="5" width="20" height="22" fill="currentColor" />
          <rect x="9" y="8" width="14" height="8" fill="#07140c" />
          <rect x="9" y="19" width="4" height="3" fill="#07140c" />
          <rect x="15" y="19" width="4" height="3" fill="#07140c" />
          <rect x="21" y="19" width="2" height="3" fill="#07140c" />
        </>
      )}
      {kind === "router" && (
        <>
          <rect x="4" y="12" width="24" height="10" fill="currentColor" />
          <rect x="7" y="6" width="2" height="8" fill="currentColor" />
          <rect x="15" y="4" width="2" height="10" fill="currentColor" />
          <rect x="23" y="6" width="2" height="8" fill="currentColor" />
          <rect x="8" y="16" width="3" height="2" fill="#07140c" />
          <rect x="14" y="16" width="3" height="2" fill="#07140c" />
        </>
      )}
      {kind === "ap" && (
        <>
          <rect x="14" y="14" width="4" height="12" fill="currentColor" />
          <rect x="8" y="8" width="16" height="8" fill="currentColor" />
          <rect x="4" y="4" width="4" height="2" fill="currentColor" />
          <rect x="24" y="4" width="4" height="2" fill="currentColor" />
          <rect x="2" y="10" width="4" height="2" fill="currentColor" />
          <rect x="26" y="10" width="4" height="2" fill="currentColor" />
        </>
      )}
      {kind === "iot" && (
        <>
          <rect x="8" y="6" width="16" height="20" fill="currentColor" />
          <rect x="11" y="10" width="10" height="8" fill="#07140c" />
          <rect x="12" y="21" width="8" height="2" fill="#07140c" />
        </>
      )}
      {kind === "firewall" && (
        <>
          <rect x="6" y="6" width="20" height="20" fill="currentColor" />
          <rect x="10" y="10" width="12" height="12" fill="#07140c" />
          <rect x="14" y="8" width="4" height="16" fill="currentColor" />
          <rect x="8" y="14" width="16" height="4" fill="currentColor" />
        </>
      )}
      {kind === "kiosk" && (
        <>
          <rect x="8" y="3" width="16" height="20" fill="currentColor" />
          <rect x="10" y="5" width="12" height="12" fill="#07140c" />
          <rect x="6" y="24" width="20" height="4" fill="currentColor" />
        </>
      )}
      {kind === "tv" && (
        <>
          <rect x="3" y="7" width="26" height="16" fill="currentColor" />
          <rect x="6" y="10" width="20" height="10" fill="#07140c" />
          <rect x="14" y="23" width="4" height="3" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function MatrixPortrait({ talking = false }: { talking?: boolean }) {
  return (
    <svg
      className={talking ? "portrait talking" : "portrait"}
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      role="img"
      aria-label="M.A.T.R.I.X."
    >
      <rect width="64" height="64" fill="#120a18" />
      <rect x="6" y="12" width="52" height="46" fill="#2a1840" />
      <rect x="12" y="18" width="40" height="32" fill="#07110d" />
      <rect x="16" y="26" width="32" height="8" fill="#39ff88" />
      <rect x="18" y="28" width="6" height="4" fill="#e9fff0" />
      <rect x="28" y="28" width="4" height="4" fill="#07110d" />
      <rect x="36" y="28" width="8" height="4" fill="#e9fff0" />
      <rect x="22" y="40" width="20" height="2" fill="#39ff88" />
      <rect x="30" y="4" width="4" height="10" fill="#ff4fd8" />
      <rect x="26" y="2" width="12" height="3" fill="#ff4fd8" />
      <rect x="8" y="14" width="4" height="4" fill="#ff4fd8" />
      <rect x="52" y="14" width="4" height="4" fill="#7af7ff" />
    </svg>
  );
}

export function TypeLine({ text }: { text: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setCount(index);
      if (index >= text.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <span
      onClick={() => setCount(text.length)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") setCount(text.length);
      }}
      role="button"
      tabIndex={0}
    >
      {text.slice(0, count)}
      {count < text.length && <i className="caret" />}
    </span>
  );
}
