import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import "./UserCard.css";

/** Confirmed against app/models/user.py: User.is_active is a real Boolean column. */
export default function UserCard({ user, onToggle, onError }) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  const active = user.is_active ?? true;

  async function handleConfirm() {
    setWorking(true);
    try {
      await onToggle(user, active);
      setConfirming(false);
    } catch (err) {
      onError?.(err);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="user-card" style={{ "--card-accent": active ? "var(--signal-done)" : "var(--signal-pending)" }}>
      <div className="user-card__avatar" aria-hidden="true">
        {user.name?.charAt(0)?.toUpperCase() || "?"}
      </div>

      <div className="user-card__info">
        <p className="user-card__name">{user.name}</p>
        <p className="user-card__email">{user.email}</p>
      </div>

      <span className={`user-card__status ${active ? "user-card__status--active" : "user-card__status--inactive"}`}>
        {active ? "Active" : "Deactivated"}
      </span>

      <button
        className={`btn ${active ? "btn--danger-outline" : "btn--primary"}`}
        onClick={() => setConfirming(true)}
      >
        {active ? "Deactivate" : "Activate"}
      </button>

      {confirming && (
        <ConfirmModal
          title={active ? "Deactivate this user?" : "Activate this user?"}
          message={
            active
              ? `${user.name} will lose access until reactivated.`
              : `${user.name} will regain access immediately.`
          }
          confirmLabel={active ? "Deactivate" : "Activate"}
          tone={active ? "danger" : "default"}
          busy={working}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
