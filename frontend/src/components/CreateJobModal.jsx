import { useState } from "react";
import "./Modal.css";

/**
 * Must match TASK_MAP in app/services/job_service.py exactly — job_type
 * is looked up there with a plain dict.get(), so anything else (including
 * the uppercase guesses this file used to have) 400s with "Unsupported
 * job type". No free-text/custom option, since there's nothing on the
 * backend that would accept one.
 */
const JOB_TYPES = [
  { value: "data_processing", label: "Data Processing" },
  { value: "report_generation", label: "Report Generation" },
  { value: "bulk_email", label: "Bulk Email" },
  { value: "image_resize", label: "Image Resize" },
];

export default function CreateJobModal({ onCreate, onClose, creating }) {
  const [jobType, setJobType] = useState(JOB_TYPES[0].value);

  function handleSubmit(e) {
    e.preventDefault();
    onCreate(jobType);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Start a new job</h3>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="job-type">Job type</label>
            <select id="job-type" value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {JOB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={creating}>
              {creating ? "Starting…" : "Start job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
