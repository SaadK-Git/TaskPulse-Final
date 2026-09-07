import { useState } from "react";
import "./Modal.css";

const KNOWN_JOB_TYPES = ["DATA_PROCESSING", "IMAGE_RESIZE", "REPORT_GENERATION", "EMAIL_BATCH"];

export default function CreateJobModal({ onCreate, onClose, creating }) {
  const [jobType, setJobType] = useState(KNOWN_JOB_TYPES[0]);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onCreate(useCustom ? custom.trim().toUpperCase() : jobType);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Start a new job</h3>
        <form className="field" style={{ marginTop: 14, gap: 14 }} onSubmit={handleSubmit}>
          {!useCustom ? (
            <div className="field">
              <label htmlFor="job-type">Job type</label>
              <select id="job-type" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                {KNOWN_JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="job-type-custom">Job type</label>
              <input
                id="job-type-custom"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="CUSTOM_JOB_TYPE"
                required
              />
            </div>
          )}

          <button
            type="button"
            className="btn btn--link"
            style={{ width: "fit-content" }}
            onClick={() => setUseCustom((v) => !v)}
          >
            {useCustom ? "Choose from list instead" : "Use a custom job type"}
          </button>

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={creating}>
              {creating ? "Starting\u2026" : "Start job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
