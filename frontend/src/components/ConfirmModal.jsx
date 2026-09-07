import "./Modal.css";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  tone = "default", // "default" | "danger"
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title">{title}</h3>
        {message && <p className="modal__body">{message}</p>}
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${tone === "danger" ? "btn--danger" : "btn--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working\u2026" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
