import React from "react";
import App from "./app";
import { RestMode } from "./components/RestMode";

type OpenOpts = { mode?: "rest" };

export function openVisualizerWindow(rendererId: "spectrum", opts?: OpenOpts) {
  try {
    const w = window.open("", "VisualizerWindow", "width=1280,height=720,noopener=yes");
    if (!w) throw new Error("Popup bloqueado");

    const d = w.document;
    d.title = "Visualizer";
    d.body.innerHTML = "";

    // Copiar estilos do host
    Array.from(document.styleSheets).forEach(ss => {
      try {
        const node = (ss as any).ownerNode as HTMLLinkElement | HTMLStyleElement | null;
        if (node) d.head.appendChild(node.cloneNode(true));
      } catch {}
    });

    const destructor = () => {
      try {
        Spicetify.ReactDOM.unmountComponentAtNode(d.body);
      } catch {}
    };

    const node =
      opts?.mode === "rest"
        ? <RestMode onWindowDestroyed={destructor} />
        : <App isSecondaryWindow onWindowDestroyed={destructor} initialRenderer={rendererId} />;

    Spicetify.ReactDOM.render(node, d.body);
    w.addEventListener("beforeunload", destructor);
  } catch (e) {
    console.debug("[Visualizer] erro ao abrir janela", e);
    Spicetify.showNotification?.("Não foi possível abrir o visualizador.");
  }
}
