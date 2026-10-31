import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: string;
        "auto-rotate"?: string;
        "rotation-per-second"?: string;
        "camera-orbit"?: string;
        "field-of-view"?: string;
        "shadow-intensity"?: string;
        exposure?: string;
        "interaction-prompt"?: string;
        "touch-action"?: string;
      };
    }
  }
}

export {};
