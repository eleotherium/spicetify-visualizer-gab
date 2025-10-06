import React from "react";
import styles from "../css/app.module.scss";
import SpectrumVisualizer from "./renderer/SpectrumVisualizerRest";
import { LyricsPanel } from "./LyricsPanel";
import { LavaLampBackground } from "./LavaLampBackground";

interface RestModeProps {
  /** Função chamada quando a janela secundária é destruída */
  onWindowDestroyed?: () => void;
}

/**
 * Tela de repouso (Rest Mode)
 * Mostra a capa da música à esquerda, letras (triplet) à direita
 * e o visualizer Spectrum na base.
 */
export const RestMode: React.FC<RestModeProps> = ({ onWindowDestroyed }) => {
  const img = getCoverUrl();
  const accent = "#7c3aed";

  return (
    <div className={styles.restRoot}>
      {/* Fundo lava-lamp animado */}
      <LavaLampBackground />

      <div className={styles.restGrid}>
        {/* Capa do álbum à esquerda */}
        <div className={styles.restLeft}>
          {img && (
            <img
              src={img}
              className={styles.coverArt}
              alt="Capa do álbum"
              draggable={false}
            />
          )}
        </div>

        {/* Letras + visualizer à direita */}
        <div className={styles.restRight}>
          <LyricsPanel mode="triplet" highlightColor={accent} />

          <div className={styles.restViz}>
            <SpectrumVisualizer
              {...({ accent, orientation: "horizontal" } as any)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Obtém a melhor imagem de capa disponível da faixa atual.
 */
function getCoverUrl(): string | null {
  try {
    const meta = Spicetify.Player.data?.item?.metadata ?? {};
    return (
      meta.image_xlarge_url ||
      meta.image_large_url ||
      meta.image_url ||
      null
    );
  } catch {
    return null;
  }
}
