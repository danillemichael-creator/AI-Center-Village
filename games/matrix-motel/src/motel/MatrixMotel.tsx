import { useEffect, useState } from "react";
import { isMuted, setMuted } from "../game/audio";
import { LESSONS, LEVELS } from "../game/levels";
import { HelpCard } from "./HelpCard";
import { Lot } from "./Lot";
import { Terminal } from "./Terminal";

export interface MatrixMotelProps {
  onExit?: () => void;
  mode?: "lot" | "office";
  initialLevel?: number;
}

type Screen = "title" | "lot" | "office" | "ending" | "help" | "floors";

const CITY_LINE = "The rest of Vice City isn't in this build. The office is the shift.";

function clampIndex(index: number) {
  if (!Number.isInteger(index)) return 0;
  return Math.min(LEVELS.length - 1, Math.max(0, index));
}

function readBoot(mode: "lot" | "office", initialLevel: number): { screen: Screen; levelIndex: number } {
  const fallbackIndex = clampIndex(initialLevel);
  if (typeof window === "undefined") {
    return { screen: mode === "office" ? "office" : "title", levelIndex: fallbackIndex };
  }
  const raw = new URLSearchParams(window.location.search).get("floor");
  if (raw !== null) {
    const floor = Number(raw);
    if (Number.isInteger(floor) && floor >= 1 && floor <= LEVELS.length) {
      return { screen: "office", levelIndex: floor - 1 };
    }
  }
  if (mode === "office") return { screen: "office", levelIndex: fallbackIndex };
  return { screen: "title", levelIndex: 0 };
}

export function MatrixMotel({ onExit, mode = "lot", initialLevel = 0 }: MatrixMotelProps) {
  const [boot] = useState(() => readBoot(mode, initialLevel));
  const [screen, setScreen] = useState<Screen>(boot.screen);
  const [levelIndex, setLevelIndex] = useState(boot.levelIndex);
  const [returnTo, setReturnTo] = useState<Screen>(mode === "office" ? "office" : "title");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMutedOn] = useState(() => isMuted());
  const [notice, setNotice] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const level = LEVELS[levelIndex] ?? LEVELS[0];

  useEffect(() => {
    if (screen !== "help" && screen !== "floors") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScreen(returnTo);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, returnTo]);

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedOn(next);
  };

  const openFloor = (index: number) => {
    setLevelIndex(clampIndex(index));
    setNonce((value) => value + 1);
    setScreen("office");
    setNotice(null);
  };

  const openPanel = (next: "help" | "floors", back: Screen) => {
    setReturnTo(back);
    setScreen(next);
  };

  const leaveBlock = () => {
    if (onExit) onExit();
    else setNotice(CITY_LINE);
  };

  const leaveOffice = () => {
    if (mode === "office") {
      if (onExit) onExit();
      else setNotice(CITY_LINE);
      return;
    }
    setNotice(null);
    setScreen("lot");
  };

  const stepOutside = () => {
    if (onExit) onExit();
    else {
      setNotice(CITY_LINE);
      setScreen("lot");
    }
  };

  const replay = () => {
    setCleared([]);
    setNotice(null);
    openFloor(0);
  };

  if (!level) return null;

  return (
    <div className="motel-app">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="brand">THE MATRIX MOTEL</p>
            <p className="brand-sub">CYBER LOCKDOWN</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="pips" aria-label="Cleared floors">
            {LEVELS.map((item) => (
              <i key={item.id} className={cleared.includes(item.id) ? "on" : ""} title={`Floor ${item.id}`} />
            ))}
          </div>
          <button type="button" className="pixel-btn" data-testid="mute" onClick={toggleMute}>
            {muted ? "MUTED" : "SOUND"}
          </button>
        </div>
      </header>

      {notice && <p className="city-note">{notice}</p>}

      {(screen === "title" || screen === "lot") && (
        <div className={screen === "title" ? "lot-screen is-title" : "lot-screen"}>
          <Lot
            locked={screen !== "lot"}
            onEnter={() => openFloor(0)}
            onKeys={() => openPanel("floors", screen === "title" ? "title" : "lot")}
            onHelp={() => openPanel("help", screen === "title" ? "title" : "lot")}
            onLeave={leaveBlock}
          />
          {screen === "title" && (
            <div className="title-card">
              <div className="card">
                <p className="kicker">VICE CITY · 2:14 AM</p>
                <h1>THE MATRIX MOTEL</h1>
                <p className="subtitle">CYBER LOCKDOWN</p>
                <p className="blurb">
                  A worm named GHOST is loose in the guest network. Five floors. Cut the vulnerable links, keep the
                  service lamps green, and don't let a shielded system turn red.
                </p>
                <div className="title-actions">
                  <button type="button" className="pixel-btn primary" data-testid="start-shift" onClick={() => openFloor(0)}>
                    START SHIFT
                  </button>
                  <button type="button" className="pixel-btn" data-testid="walk-lot" onClick={() => setScreen("lot")}>
                    WALK THE LOT
                  </button>
                  <button type="button" className="pixel-btn" data-testid="keycards" onClick={() => openPanel("floors", "title")}>
                    KEYCARDS
                  </button>
                  <button type="button" className="pixel-btn" data-testid="how-to" onClick={() => openPanel("help", "title")}>
                    HOW TO PLAY
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === "office" && (
        <Terminal
          key={`${level.id}-${nonce}`}
          level={level}
          isLast={levelIndex >= LEVELS.length - 1}
          leaveLabel={mode === "office" ? "STEP OUTSIDE" : "BACK TO THE LOT"}
          onCleared={() => {
            setCleared((prev) => (prev.includes(level.id) ? prev : [...prev, level.id]));
          }}
          onNext={() => {
            if (levelIndex >= LEVELS.length - 1) setScreen("ending");
            else openFloor(levelIndex + 1);
          }}
          onLeave={leaveOffice}
          onJump={openFloor}
        />
      )}

      {screen === "floors" && (
        <FloorPicker
          cleared={cleared}
          onPick={openFloor}
          onBack={() => setScreen(returnTo)}
        />
      )}

      {screen === "help" && (
        <section className="panel-screen">
          <HelpCard />
          <button type="button" className="pixel-btn primary" onClick={() => setScreen(returnTo)}>
            BACK
          </button>
        </section>
      )}

      {screen === "ending" && <EndingScreen onReplay={replay} onLeave={stepOutside} />}
    </div>
  );
}

function FloorPicker({
  cleared,
  onPick,
  onBack,
}: {
  cleared: number[];
  onPick: (index: number) => void;
  onBack: () => void;
}) {
  return (
    <section className="panel-screen">
      <p className="kicker">FRONT DESK</p>
      <h2>FLOOR KEYCARDS</h2>
      <p className="blurb">Each card is a floor of the motel network. Secured floors stay lit.</p>
      <div className="floor-grid">
        {LEVELS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={cleared.includes(item.id) ? "floor-card secured" : "floor-card"}
            data-testid={`floor-${item.id}`}
            onClick={() => onPick(index)}
          >
            <b>FLOOR {item.id}</b>
            <span>{item.codename}</span>
            <em>{cleared.includes(item.id) ? "SECURED" : item.principle}</em>
          </button>
        ))}
      </div>
      <button type="button" className="pixel-btn" onClick={onBack}>
        BACK
      </button>
    </section>
  );
}

function EndingScreen({ onReplay, onLeave }: { onReplay: () => void; onLeave: () => void }) {
  return (
    <section className="ending" data-testid="ending">
      <p className="kicker">05:41 AM · SHIFT OVER</p>
      <h1>MATRIX MOTEL SECURED</h1>
      <p className="ending-lead">
        The vacancy sign is still buzzing. GHOST is boxed on the guest side. Payment, cameras, and booking still reach
        the vault. The neon stays on.
      </p>
      <ol className="lessons">
        {LESSONS.map((lesson) => (
          <li key={lesson}>{lesson}</li>
        ))}
      </ol>
      <div className="ending-actions">
        <button type="button" className="pixel-btn primary" data-testid="replay" onClick={onReplay}>
          REPLAY THE SHIFT
        </button>
        <button type="button" className="pixel-btn" data-testid="step-outside" onClick={onLeave}>
          STEP OUTSIDE
        </button>
      </div>
    </section>
  );
}
