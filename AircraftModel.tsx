"use client";

import { useEffect, useState } from "react";

const MODEL_VIEWER_URL = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js";

export function AircraftModel({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (customElements.get("model-viewer")) {
      setViewerReady(true);
      return;
    }
    let script = document.querySelector<HTMLScriptElement>("script[data-aircraft-model-viewer]");
    if (!script) {
      script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_URL;
      script.dataset.aircraftModelViewer = "true";
      document.head.appendChild(script);
    }
    const onReady = () => setViewerReady(true);
    script.addEventListener("load", onReady);
    customElements.whenDefined("model-viewer").then(onReady);
    return () => script?.removeEventListener("load", onReady);
  }, []);

  if (!viewerReady) return <div className={`aircraft-model-loading ${className}`} aria-label="Загрузка 3D-модели самолёта"><span/><small>ЗАГРУЖАЕМ 3D-МОДЕЛЬ</small></div>;

  return <model-viewer
    className={`aircraft-model-viewer ${className}`}
    src={src}
    alt={alt}
    camera-controls="true"
    auto-rotate="true"
    rotation-per-second="7deg"
    camera-orbit="35deg 68deg auto"
    field-of-view="27deg"
    shadow-intensity="0.8"
    exposure="1.1"
    interaction-prompt="none"
    touch-action="pan-y"
  />;
}
