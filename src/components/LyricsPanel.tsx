import React, { useEffect, useState } from "react";
import styles from "../css/app.module.scss";

interface Line {
  startTimeMs: number;
  words: string;
}

interface LyricsPanelProps {
  mode?: "overlay" | "triplet";
  highlightColor?: string;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  mode = "overlay",
  highlightColor = "#7c3aed"
}) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [idx, setIdx] = useState<number>(0);

  // carregar letras ao trocar de música
  useEffect(() => {
    let active = true;

    async function loadLyrics() {
      try {
        const uri = Spicetify.Player.data?.item?.uri;
        if (!uri) return;
        const gid = uri.split(":").pop();
        const res = await Spicetify.CosmosAsync.get(
          `hm://lyrics/v1/track/${gid}`
        ).catch(() => null);

        const arr =
          res?.lyrics?.lines || res?.lyricsData?.lines || [];
        const parsed: Line[] = arr.map((l: any) => ({
          startTimeMs: Number(l.startTimeMs),
          words: String(l.words)
        }));

        if (active) setLines(parsed);
      } catch (e) {
        console.debug("[LyricsPanel] Falha ao buscar letras", e);
      }
    }

    loadLyrics();
    const handler = () => loadLyrics();
    Spicetify.Player.addEventListener("songchange", handler);

    return () => {
    active = false;
    Spicetify.Player.removeEventListener("songchange", handler as any);
    };
  }, []);

  // sincronizar linha atual
  useEffect(() => {
    if (!lines.length) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const ms = Spicetify.Player.getProgress?.() ?? 0;
      let curr = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startTimeMs <= ms) curr = i;
        else break;
      }
      setIdx(curr);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [lines]);

  if (!lines.length) return null;

  if (mode === "triplet") {
    const prev = lines[idx - 1]?.words ?? "";
    const curr = lines[idx]?.words ?? "";
    const next = lines[idx + 1]?.words ?? "";

    return (
      <div className={styles.lyricsTriplet}>
        <div className={styles.linePrev}>{prev}</div>
        <div className={styles.lineCurr} style={{ color: highlightColor }}>
          {curr}
        </div>
        <div className={styles.lineNext}>{next}</div>
      </div>
    );
  }

  // modo overlay
  const windowSize = 6;
  const start = Math.max(0, idx - Math.floor(windowSize / 2));
  const slice = lines.slice(start, start + windowSize);

  return (
    <div className={styles.lyricsOverlayBox}>
      {slice.map((l, i) => {
        const isCurr = l === lines[idx];
        return (
          <div
            key={start + i}
            className={isCurr ? styles.overlayCurr : styles.overlayLine}
            style={isCurr ? { color: highlightColor } : undefined}
          >
            {l.words}
          </div>
        );
      })}
    </div>
  );
};
