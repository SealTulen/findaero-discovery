import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  alt?: string;
  "camera-controls"?: string;
  "auto-rotate"?: string;
  "rotation-per-second"?: string;
  "camera-orbit"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "camera-target"?: string;
  "field-of-view"?: string;
  "shadow-intensity"?: string;
  exposure?: string;
  "interaction-prompt"?: string;
  "touch-action"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}
