import React, { useEffect, useRef, useMemo } from "react";
import styles from "../../css/app.module.scss";

export interface SpectrumVisualizerProps {
  accent?: string;
  orientation?: "horizontal" | "vertical";
  onError?: (msg: string | null) => void;
}

/**
 * SpectrumVisualizerRest — Spectrum isolado (sempre no topo)
 */
const SpectrumVisualizerRest: React.FC<SpectrumVisualizerProps> = ({
  accent = "#7c3aed",
  orientation = "horizontal",
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const barConfig = useMemo(() => {
    if (orientation === "vertical") {
      return { barWidth: 6, gap: 2, minBars: 48, maxBars: 96 };
    }
    return { barWidth: 10, gap: 3, minBars: 48, maxBars: 96 };
  }, [orientation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // canvas sempre opaco e próprio stacking context
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      onError?.("Canvas 2D não suportado");
      return;
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const { width, height } = canvas;

      // fundo sólido
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const fft =
        ((Spicetify.Player as any).getAudioData?.() as { fft: number[] })?.fft ?? [];
      if (!fft.length) return;

      const { barWidth, gap, minBars, maxBars } = barConfig;
      const primary = orientation === "vertical" ? height : width;
      const bars = Math.min(maxBars, Math.max(minBars, Math.floor(primary / (barWidth + gap))));
      const slice = Math.floor(fft.length / bars);

      ctx.fillStyle = accent;
      for (let i = 0; i < bars; i++) {
        let amp = 0;
        for (let j = 0; j < slice; j++) amp += fft[i * slice + j] || 0;
        amp /= slice;
        const mag = Math.pow(amp, 0.7);

        if (orientation === "vertical") {
          const len = mag * width * 0.9;
          const y = i * (barWidth + gap);
          const x = (width - len) / 2;
          ctx.fillRect(x, y, len, barWidth);
        } else {
          const h = mag * height * 0.9;
          const x = i * (barWidth + gap);
          const y = height - h;
          ctx.fillRect(x, y, barWidth, h);
        }
      }
    };

    render();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [accent, barConfig, orientation, onError]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.spectrumCanvas}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9999, // fica acima de tudo
        isolation: "isolate", // cria stacking context independente
        backgroundColor: "#000", // sólido, sem blend
        mixBlendMode: "normal",
        pointerEvents: "none",
      }}
    />
  );
};

export default SpectrumVisualizerRest;
