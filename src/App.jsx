import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./styles.css";

/* ============================================================================
   BouquetApp.jsx
   A single-file, self-contained React component for a virtual bouquet gift.
   Drop into a Vite or Create React App project (e.g. src/BouquetApp.jsx),
   import it from App.jsx / main.jsx, and deploy the build output to
   GitHub Pages. No backend, no external state libraries, no build config
   beyond a standard React + CSS pipeline.

   CUSTOMIZE ME — search for "CUSTOMIZE" comments to find every spot meant
   to be edited: flower names/meanings, the love letter text, the audio
   file, and the recipient's name.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   CUSTOMIZE: Recipient name, used in the landing tag and the letter salutation.
--------------------------------------------------------------------------- */
const RECIPIENT_NAME = "Lourdette my baby";

/* ---------------------------------------------------------------------------
   CUSTOMIZE: Background audio. Point this at any royalty-free mp3/ogg you
   host alongside the app (e.g. /public/audio/song.mp3 → "/audio/song.mp3").
   Leave as "" to hide the audio toggle entirely.
--------------------------------------------------------------------------- */
const AUDIO_SRC = ""; // e.g. "/audio/soft-piano.mp3"

/* ---------------------------------------------------------------------------
   CUSTOMIZE: The love letter. Edit freely — line breaks are respected.
--------------------------------------------------------------------------- */
const LOVE_LETTER = {
  salutation: `My dearest ${RECIPIENT_NAME},`,
  paragraphs: [
    "I picked each of these for a reason. Every stem here is something I noticed about you, turned into a flower, because words alone felt too plain for what I mean.",
    "If you're reading this, you tapped the ribbon — which is exactly the kind of curious, unhurried thing you do that I love. Take your time with it. There's no rush here, only this small, quiet room I built for the two of us.",
    "Wherever you are when you read this, I hope it makes you feel exactly as looked-after as you make me feel every day.",
  ],
  signoff: "Always yours,",
  signature: "Carl",
};

/* ---------------------------------------------------------------------------
   CUSTOMIZE: The bouquet. Each entry is one flower in the arrangement.
   - id: unique key
   - kind: "rose" | "peony" | "lavender" | "daisy"  (controls the SVG shape)
   - x / y: position within the 0–100 bouquet coordinate space
   - size: relative scale, ~0.75–1.25 is the sane range
   - rotate: resting tilt in degrees
   - color: main petal color (any CSS color)
   - name / meaning: shown in the tap tooltip and modal
--------------------------------------------------------------------------- */
const FLOWERS = [
  { id: "f1", kind: "peony", x: 32, y: 40, size: 1.15, rotate: -6, color: "var(--blush)", name: "Blush Peony", meaning: "For a love that arrived, and stayed, on its own gentle terms." },
  { id: "f2", kind: "rose", x: 50, y: 30, size: 1.05, rotate: 3, color: "var(--rose-deep)", name: "Pink Rose", meaning: "For gentleness, admiration, and the quiet kind of affection." },
  { id: "f3", kind: "rose", x: 66, y: 42, size: 1.0, rotate: -4, color: "var(--rose-light)", name: "Light Rose", meaning: "For grace — the kind you carry without noticing." },
  { id: "f4", kind: "lavender", x: 22, y: 55, size: 0.9, rotate: 8, color: "var(--lavender)", name: "Lavender Sprig", meaning: "For calm, and for every steady moment you've given me." },
  { id: "f5", kind: "lavender", x: 76, y: 56, size: 0.9, rotate: -9, color: "var(--lavender-deep)", name: "Lavender Sprig", meaning: "For devotion that doesn't need to announce itself." },
  { id: "f6", kind: "daisy", x: 42, y: 58, size: 0.85, rotate: 5, color: "var(--cream)", name: "Cream Daisy", meaning: "For innocence, and the way you still find wonder in small things." },
  { id: "f7", kind: "daisy", x: 58, y: 60, size: 0.85, rotate: -3, color: "var(--gold-soft)", name: "Golden Daisy", meaning: "For warmth — you make every room a little brighter." },
  { id: "f8", kind: "peony", x: 50, y: 48, size: 0.95, rotate: 0, color: "var(--sage-bloom)", name: "Sage Peony", meaning: "For growth, and for choosing this — us — again and again." },
];

/* ============================== Utilities ============================== */

/** Deterministic-ish pseudo-random generator so particle layout is stable
 *  per session but still feels organic (no external deps). */
function useSeededParticles(count) {
  return useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      id: `p-${i}`,
      left: rand() * 100,
      delay: rand() * 18,
      duration: 14 + rand() * 12,
      size: 6 + rand() * 10,
      drift: (rand() - 0.5) * 120,
      rotateStart: rand() * 360,
      opacity: 0.35 + rand() * 0.4,
    }));
  }, [count]);
}

/* ============================ Particle Layer ============================ */

function PetalField({ density = 22 }) {
  const petals = useSeededParticles(density);
  return (
    <div className="petal-field" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.8}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
            // custom properties consumed by the keyframe in styles.css
            "--drift": `${p.drift}px`,
            "--rot-start": `${p.rotateStart}deg`,
          }}
        />
      ))}
    </div>
  );
}

/* ========================= Confetti Burst (letter) ======================= */

function ConfettiBurst({ triggerKey }) {
  const pieces = useMemo(() => {
    let seed = triggerKey * 7 + 11;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: 26 }, (_, i) => ({
      id: `c-${triggerKey}-${i}`,
      left: 40 + rand() * 20,
      delay: rand() * 0.4,
      duration: 1.6 + rand() * 1.1,
      drift: (rand() - 0.5) * 260,
      size: 7 + rand() * 8,
      hue: ["var(--blush)", "var(--lavender)", "var(--gold-soft)", "var(--rose-light)"][i % 4],
    }));
  }, [triggerKey]);

  if (!triggerKey) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((c) => (
        <span
          key={c.id}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            background: c.hue,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            "--drift": `${c.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================ SVG Flower Shapes =========================== */
/* Small, hand-built vector shapes rather than a single generic "flower icon"
   repeated — each kind reads differently at a glance. All are drawn on a
   0..100 local viewBox and positioned/scaled by the parent <g>. */

function PetalShape({ kind, color }) {
  switch (kind) {
    case "rose":
      return (
        <g>
          <circle cx="50" cy="52" r="21" fill={color} opacity="0.55" />
          <path d="M50 30 C62 34 66 46 58 56 C50 64 40 62 38 52 C36 42 42 32 50 30Z" fill={color} />
          <path d="M50 38 C57 40 59 47 54 52 C49 57 42 55 41 49 C40 43 44 37 50 38Z" fill={color} opacity="0.85" />
          <circle cx="50" cy="48" r="4.5" fill="var(--gold-soft)" opacity="0.9" />
        </g>
      );
    case "peony":
      return (
        <g>
          {[0, 51, 102, 153, 204, 255, 306].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="30"
              rx="13"
              ry="19"
              fill={color}
              opacity="0.9"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="9" fill="var(--gold-soft)" opacity="0.85" />
        </g>
      );
    case "daisy":
      return (
        <g>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="28"
              rx="6.5"
              ry="17"
              fill={color}
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="8" fill="var(--gold-deep)" />
        </g>
      );
    case "lavender":
    default:
      return (
        <g>
          {[-18, -9, 0, 9, 18].map((offset, i) => (
            <ellipse
              key={offset}
              cx="50"
              cy={26 + i * 9}
              rx="7"
              ry="6"
              fill={color}
              opacity={0.75 + i * 0.05}
            />
          ))}
        </g>
      );
  }
}

/* ============================== Single Flower ============================= */

function Flower({ flower, isActive, onActivate }) {
  const [swaying, setSwaying] = useState(false);
  const nodeRef = useRef(null);

  const activate = useCallback(() => {
    onActivate(flower);
  }, [flower, onActivate]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <button
      ref={nodeRef}
      type="button"
      className={`bouquet-flower${isActive ? " is-active" : ""}`}
      style={{
        left: `${flower.x}%`,
        top: `${flower.y}%`,
        "--size": flower.size,
        "--rotate": `${flower.rotate}deg`,
      }}
      onClick={activate}
      onTouchEnd={(e) => {
        // Prevent the ghost-click-after-touch issue on iOS Safari while
        // still allowing normal scrolling gestures to pass through.
        activate();
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setSwaying(true)}
      onMouseLeave={() => setSwaying(false)}
      aria-label={`${flower.name}: view meaning`}
      aria-expanded={isActive}
    >
      <svg viewBox="0 0 100 100" className={`flower-svg${swaying ? " is-swaying" : ""}`}>
        <PetalShape kind={flower.kind} color={flower.color} />
      </svg>
    </button>
  );
}

/* ============================ Flower Meaning Modal ========================= */

function FlowerModal({ flower, onClose }) {
  if (!flower) return null;
  return (
    <div className="modal-scrim" role="presentation" onClick={onClose}>
      <div
        className="flower-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flower-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 100 100" className="flower-modal-icon">
          <PetalShape kind={flower.kind} color={flower.color} />
        </svg>
        <h3 id="flower-modal-title">{flower.name}</h3>
        <p>{flower.meaning}</p>
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/* =============================== Love Letter =============================== */

function LetterModal({ open, onClose, onReplay }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-scrim letter-scrim" role="presentation" onClick={onClose}>
      <div
        className="letter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="letter-modal-inner">
          <p className="letter-eyebrow">A note, just for you</p>
          <h2 id="letter-title">{LOVE_LETTER.salutation}</h2>
          {LOVE_LETTER.paragraphs.map((para, i) => (
            <p className="letter-paragraph" key={i}>
              {para}
            </p>
          ))}
          <p className="letter-signoff">
            {LOVE_LETTER.signoff}
            <br />
            <span className="letter-signature">{LOVE_LETTER.signature}</span>
          </p>
          <div className="letter-actions">
            <button type="button" className="btn btn-ghost" onClick={onReplay}>
              Scatter petals again
            </button>
            <button
              ref={closeRef}
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              onTouchEnd={onClose}
            >
              Close letter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ Audio Toggle ================================ */

function AudioToggle({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  if (!src) return null;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => {
        /* Autoplay-policy rejections are expected until a user gesture
           has occurred; the click itself counts, so this mainly guards
           against missing/broken audio files. */
      });
    }
    setPlaying((p) => !p);
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        type="button"
        className={`audio-toggle${playing ? " is-playing" : ""}`}
        onClick={toggle}
        onTouchEnd={(e) => {
          e.preventDefault();
          toggle();
        }}
        aria-pressed={playing}
        aria-label={playing ? "Pause music" : "Play music"}
      >
        <span className="audio-toggle-icon" aria-hidden="true">
          {playing ? (
            <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </span>
      </button>
    </>
  );
}

/* ================================ Landing ================================= */

function Landing({ onOpen }) {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = () => {
    if (isOpening) return;
    setIsOpening(true);
    // Let the lid-lift animation play before switching views.
    window.setTimeout(onOpen, 900);
  };

  return (
    <section className={`landing${isOpening ? " is-opening" : ""}`}>
      <PetalField density={16} />
      <div className="landing-content">
        <p className="landing-eyebrow">A small delivery for Lourdette</p>
        <h1 className="landing-title">Something's arrived</h1>
        <button
          type="button"
          className="gift-box"
          onClick={handleOpen}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleOpen();
          }}
          aria-label="Open your gift"
        >
          <span className="gift-box-lid" />
          <span className="gift-box-base" />
          <span className="gift-box-ribbon-v" />
          <span className="gift-box-ribbon-h" />
          <span className="gift-box-glow" />
        </button>
        <p className="landing-hint">Tap the box to open it</p>
      </div>
    </section>
  );
}

/* ============================== Bouquet View =============================== */

function BouquetView({ onOpenLetter }) {
  const [activeFlower, setActiveFlower] = useState(null);

  return (
    <section className="bouquet-view">
      <PetalField density={10} />
      <header className="bouquet-header">
        <p className="bouquet-eyebrow">Every stem means something</p>
        <h1 className="bouquet-title">For {RECIPIENT_NAME}</h1>
        <p className="bouquet-subtitle">Tap a flower to see what it stands for.</p>
      </header>

      <div className="bouquet-stage">
        <svg className="bouquet-stems" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {FLOWERS.map((f) => (
            <path
              key={f.id}
              d={`M ${f.x} ${f.y + 6} Q ${(f.x + 50) / 2} 92, 50 98`}
              stroke="var(--stem-green)"
              strokeWidth="0.9"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </svg>

        {FLOWERS.map((f) => (
          <Flower
            key={f.id}
            flower={f}
            isActive={activeFlower?.id === f.id}
            onActivate={setActiveFlower}
          />
        ))}

        <button
          type="button"
          className="bouquet-ribbon"
          onClick={onOpenLetter}
          onTouchEnd={(e) => {
            e.preventDefault();
            onOpenLetter();
          }}
          aria-label="Untie the ribbon to read a letter"
        >
          <svg viewBox="0 0 160 60" className="ribbon-svg">
            <path
              d="M10 8 C 40 -4, 120 -4, 150 8 L150 30 C 120 24, 40 24, 10 30 Z"
              fill="var(--gold-deep)"
            />
            <path d="M55 24 L80 40 L60 44 Z" fill="var(--gold-soft)" />
            <path d="M105 24 L80 40 L100 44 Z" fill="var(--gold-soft)" />
            <circle cx="80" cy="19" r="9" fill="var(--gold-deep)" />
          </svg>
          <span className="ribbon-label">Untie the ribbon</span>
        </button>
      </div>

      <FlowerModal flower={activeFlower} onClose={() => setActiveFlower(null)} />
    </section>
  );
}

/* ================================ App Root ================================= */

export default function BouquetApp() {
  // "landing" -> "bouquet" ; letter modal + confetti tracked independently
  const [view, setView] = useState("landing");
  const [letterOpen, setLetterOpen] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const openLetter = useCallback(() => {
    setLetterOpen(true);
    setConfettiKey((k) => k + 1);
  }, []);

  const replayConfetti = useCallback(() => {
    setConfettiKey((k) => k + 1);
  }, []);

  useEffect(() => {
    // Lock background scroll while any modal-like overlay is open.
    document.body.style.overflow = letterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [letterOpen]);

  return (
    <div className="bouquet-app">
      {view === "landing" ? (
        <Landing onOpen={() => setView("bouquet")} />
      ) : (
        <BouquetView onOpenLetter={openLetter} />
      )}

      <LetterModal open={letterOpen} onClose={() => setLetterOpen(false)} onReplay={replayConfetti} />
      <ConfettiBurst triggerKey={confettiKey} />
      <AudioToggle src={AUDIO_SRC} />
    </div>
  );
}
