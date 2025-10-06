import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./css/app.module.scss";
import LoadingIcon from "./components/LoadingIcon";
import { CacheStatus, ExtensionKind, MetadataService } from "./metadata";
import { parseProtobuf } from "./protobuf/defs";
import { ColorResult } from "./protobuf/ColorResult";
import { ErrorData, ErrorHandlerContext, ErrorRecovery } from "./error";
import SpectrumVisualizer from "./components/renderer/SpectrumVisualizer";
import { MainMenuButton } from "./menu";
import { useFullscreenElement } from "./hooks";
import { LyricsPanel } from "./components/LyricsPanel";
import { LavaLampBackground } from "./components/LavaLampBackground";
import { openVisualizerWindow } from "./window";

/* -------------------------------------------------- */
/* ------------------- Tipagens ---------------------- */
/* -------------------------------------------------- */

export interface RendererProps {
  isEnabled: boolean;
  themeColor: Spicetify.Color;
  audioAnalysis?: SpotifyAudioAnalysis;
}

export interface RendererDefinition {
  id: string;
  name: string;
  renderer: React.FunctionComponent<RendererProps>;
}

const RENDERERS: RendererDefinition[] = [
  { id: "spectrum", name: "Spectrum", renderer: SpectrumVisualizer }
];

type VisualizerState =
  | { state: "loading" | "running" }
  | { state: "error"; errorData: ErrorData };

interface AppProps {
  isSecondaryWindow?: boolean;
  onWindowDestroyed?: () => void;
  initialRenderer?: string;
}

/* -------------------------------------------------- */
/* ------------------- Componente -------------------- */
/* -------------------------------------------------- */

export default function App({
  isSecondaryWindow,
  onWindowDestroyed,
  initialRenderer
  }: AppProps): React.ReactElement {
  const [rendererId, setRendererId] = useState<string>(initialRenderer ?? "spectrum");
  const Renderer = RENDERERS[0].renderer;

  const containerRef = useRef<HTMLDivElement>(null);

  // destrói quando a janela filha fecha
  if (containerRef.current && !containerRef.current.ownerDocument.defaultView) {
    onWindowDestroyed?.();
  }

  const isFullscreen = Boolean(useFullscreenElement(containerRef.current?.ownerDocument));

  const [state, setState] = useState<VisualizerState>({ state: "loading" });
  const [trackData, setTrackData] = useState<{
    audioAnalysis?: SpotifyAudioAnalysis;
    themeColor: Spicetify.Color;
  }>({
    themeColor: Spicetify.Color.fromHex("#535353")
  });

  const updateState = useCallback(
    (newState: VisualizerState): void =>
      setState(old => {
        if (old.state === "error" && old.errorData.recovery === ErrorRecovery.NONE) return old;
        return newState;
      }),
    []
  );

  const onError = useCallback(
    (msg: string, recovery: ErrorRecovery): void => {
      updateState({ state: "error", errorData: { message: msg, recovery } });
    },
    [updateState]
  );

  const isUnrecoverableError =
    state.state === "error" && state.errorData.recovery === ErrorRecovery.NONE;

  const metadataService = useMemo(() => new MetadataService(), []);

  const updatePlayerState = useCallback(
    async (newState: Spicetify.PlayerState): Promise<void> => {
      const item = newState?.item;
      if (!item) {
        onError("Start playing a song to see the visualization!", ErrorRecovery.SONG_CHANGE);
        return;
      }

      const uri = Spicetify.URI.fromString(item.uri);
      if (uri.type !== Spicetify.URI.Type.TRACK) {
        onError(
          "Error: The type of track you're listening to is currently not supported",
          ErrorRecovery.SONG_CHANGE
        );
        return;
      }

      updateState({ state: "loading" });

      const analysisUrl = `https://spclient.wg.spotify.com/audio-attributes/v1/audio-analysis/${uri.id}?format=json`;

      const [audioAnalysis, vibrantColor] = await Promise.all([
        Spicetify.CosmosAsync.get(analysisUrl).catch(() => null),
        metadataService
          .fetch(ExtensionKind.EXTRACTED_COLOR, item.metadata.image_url)
          .catch(() => null)
          .then(colors => {
            if (
              !colors ||
              colors.value.length === 0 ||
              colors.typeUrl !==
                "type.googleapis.com/spotify.context_track_color.ColorResult"
            ) {
              return Spicetify.Color.fromHex("#535353");
            }
            const colorResult = parseProtobuf(colors.value, ColorResult);
            const colorHex =
              colorResult.colorLight?.rgb?.toString(16).padStart(6, "0") ?? "535353";
            return Spicetify.Color.fromHex(`#${colorHex}`);
          })
      ]);

      if (!audioAnalysis) {
        onError("Could not load audio analysis.", ErrorRecovery.MANUAL);
        return;
      }

      if (typeof audioAnalysis !== "object" || !("track" in audioAnalysis)) {
        onError("Invalid audio analysis data.", ErrorRecovery.MANUAL);
        return;
      }

      setTrackData({
        audioAnalysis: audioAnalysis as SpotifyAudioAnalysis,
        themeColor: vibrantColor!
      });
      updateState({ state: "running" });
    },
    [metadataService, onError, updateState]
  );

  useEffect(() => {
    if (isUnrecoverableError) return;

    const listener = (event?: Event & { data: Spicetify.PlayerState }): void => {
      if (event?.data) updatePlayerState(event.data);
    };

    Spicetify.Player.addEventListener("songchange", listener);
    updatePlayerState(Spicetify.Player.data);
    return () => {
      Spicetify.Player.removeEventListener("songchange", listener as PlayerEventListener);
    };
  }, [isUnrecoverableError, updatePlayerState]);

  /* -------------------------------------------------- */
  /* --------------------- Render ---------------------- */
  /* -------------------------------------------------- */

  return (
    <div className="visualizer-container" ref={containerRef}>
      <LavaLampBackground />

      {!isUnrecoverableError && (
        <>
          <ErrorHandlerContext.Provider value={onError}>
            <Renderer
              isEnabled={state.state === "running"}
              audioAnalysis={trackData.audioAnalysis}
              themeColor={trackData.themeColor}
            />
          </ErrorHandlerContext.Provider>

          {/* Letras sobrepostas */}
          <div className={styles.lyrics_overlay}>
            <LyricsPanel mode="overlay" />
          </div>

          <MainMenuButton
            className={styles.main_menu_button}
            renderInline={isSecondaryWindow || isFullscreen}
            renderers={RENDERERS}
            currentRendererId={rendererId}
            isFullscreen={isFullscreen}
            onEnterFullscreen={() => containerRef.current?.requestFullscreen()}
            onExitFullscreen={() =>
              containerRef.current?.ownerDocument.exitFullscreen()
            }
            onOpenWindow={() => openVisualizerWindow("spectrum", { mode: "rest" })}
            onSelectRenderer={() => setRendererId("spectrum")}
          />
        </>
      )}

      {state.state === "loading" ? (
        <LoadingIcon />
      ) : state.state === "error" ? (
        <div className={styles.error_container}>
          <div className={styles.error_message}>{state.errorData.message}</div>
          {state.errorData.recovery === ErrorRecovery.MANUAL && (
            <Spicetify.ReactComponent.ButtonPrimary
              onClick={() => updatePlayerState(Spicetify.Player.data)}
            >
              Try again
            </Spicetify.ReactComponent.ButtonPrimary>
          )}
        </div>
      ) : null}
    </div>
  );
}
