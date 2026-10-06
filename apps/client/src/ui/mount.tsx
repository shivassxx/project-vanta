import { createRoot } from "react-dom/client";
import type { SessionStore } from "../game/session";
import { Overlay, type OverlayProps } from "./Overlay";

export function mountOverlay(el: HTMLElement | null, props: Omit<OverlayProps, "store">, store: SessionStore): void {
  if (!el) return;
  createRoot(el).render(<Overlay store={store} {...props} />);
}
