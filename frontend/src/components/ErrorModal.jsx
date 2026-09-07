import "./Modal.css";

export default function ErrorModal({ error, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--error"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__badge modal__badge--error">
          {error.status ? `Error ${error.status}` : "Error"}
        </div>
        <h3 id="error-modal-title">{error.title}</h3>
        <p className="modal__body">{error.message}</p>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose} autoFocus>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
