import { createPortal } from "react-dom";

/**
 * Renders children directly into document.body, outside the normal
 * component tree. Modals need this because a `position: fixed` element
 * gets boxed in by ANY ancestor with a transform (even a no-op one like
 * `translateY(0)` left behind by a CSS animation's final keyframe) —
 * the modal ends up positioned relative to that ancestor instead of the
 * viewport, which is what was clipping/misplacing the logs modal.
 */
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
