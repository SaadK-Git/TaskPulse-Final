import React, { useState, useEffect, useCallback } from "react";
import { Calendar, X, ChevronLeft, ChevronRight, ListChecks, LayoutGrid, UserCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePersistedState, clearPersistedState } from "../hooks/usePersistedState";

const API_BASE = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Shared primitives (same pattern as AdminPanel — kept local so this file
// can drop in independently; if you'd rather share one copy, move
// useEscapeKey / ErrorModal / apiFetch / STATUS_STYLES / PRIORITY_STYLES
// into a shared module and import from both places).
// ---------------------------------------------------------------------------

function useEscapeKey(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

function ErrorModal({ message, onClose }) {
  useEscapeKey(onClose);
  if (!message) return null;
  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#B3261E" }}>Something went wrong</h3>
          <button onClick={onClose} className="mem-icon-btn" style={s.iconBtn}><X size={16} /></button>
        </div>
        <p style={{ color: "#4B5563", fontSize: 14, marginTop: 12 }}>{message}</p>
        <button onClick={onClose} className="mem-primary-btn" style={{ ...s.primaryBtn, marginTop: 16, width: "100%" }}>Close</button>
      </div>
    </div>
  );
}

// Same "was this page full?" pagination used across AdminPanel — these two
// endpoints (/membersProject, /memberTasks) return a plain page with no
// total count, so a numbered pager isn't possible; prev/next is.
function SimplePagination({ page, hasMore, onChange }) {
  return (
    <div style={s.paginationBar}>
      <button style={s.pageArrow} disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></button>
      <span style={{ fontSize: 13, color: "#6B7280", padding: "0 10px", display: "flex", alignItems: "center" }}>Page {page}</span>
      <button style={s.pageArrow} disabled={!hasMore} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></button>
    </div>
  );
}

const STATUS_STYLES = {
  active: { bg: "#E6F1FB", text: "#0C447C", label: "Active" },
  on_hold: { bg: "#FAEEDA", text: "#854F0B", label: "On hold" },
  completed: { bg: "#EAF3DE", text: "#27500A", label: "Completed" },
};

function StatusBadge({ status }) {
  const st = STATUS_STYLES[status] || STATUS_STYLES.active;
  return (
    <span style={{ background: st.bg, color: st.text, padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500 }}>
      {st.label}
    </span>
  );
}

const PRIORITY_STYLES = {
  low: { bg: "#EAF3DE", text: "#27500A" },
  medium: { bg: "#FAEEDA", text: "#854F0B" },
  high: { bg: "#FAECE7", text: "#993C1D" },
};

const TASK_STATUS_STYLES = {
  todo: { bg: "#F3F4F6", text: "#374151", label: "To do" },
  in_progress: { bg: "#E6F1FB", text: "#0C447C", label: "In progress" },
  done: { bg: "#EAF3DE", text: "#27500A", label: "Done" },
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ active, onSelect, username, onLogout }) {
  const items = [
    { key: "projects", label: "Projects assigned", icon: LayoutGrid },
    { key: "tasks", label: "Tasks assigned", icon: ListChecks },
  ];
  return (
    <div className="mem-sidebar-scroll" style={s.sidebar}>
      <div style={s.sidebarBrand}>My workspace</div>
      <div style={{ flex: 1 }}>
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="mem-nav-item" style={{ ...s.navItem, ...(active === key ? s.navItemActive : {}) }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div style={{ borderTop: "1px solid #2A3341", padding: "16px 20px" }}>
        {username && <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>{username}</div>}
        <button onClick={onLogout} className="mem-nav-item" style={{ ...s.navItem, padding: 0, color: "#9CA3AF" }}>
          Log out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects Assigned
// ---------------------------------------------------------------------------

function ProjectCard({ project }) {
  return (
    <div className="mem-project-card" style={s.projectCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 22, fontWeight: 500 }}>{project.name}</div>
        {/* NOTE: ProjectMemberRead currently has no `status` field — falls
            back to "Active" until the schema/query return one. */}
        <StatusBadge status={project.status} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        <div style={{ ...s.infoBox, flex: 2 }}>
          <span style={{ color: "#6B7280", fontSize: 13 }}>Description</span>
          <div style={{ marginTop: 4, fontSize: 14 }}>{project.description}</div>
        </div>
        <div style={{ ...s.infoBox, flex: 1 }}>
          <span style={{ color: "#6B7280", fontSize: 13 }}>
            <Calendar size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Deadline
          </span>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            {project.deadline ? new Date(project.deadline).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsAssignedView({ setError }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // #5/#6: page survives a refresh, same as every other list in the app.
  const [page, setPage] = usePersistedState("mem.projects.page", 1);
  const pageSize = 5; // matches the 5-per-page pattern used across the rest of the app

  const loadProjects = useCallback(() => {
    setLoading(true);
    apiFetch(`${API_BASE}/membersProject?pageNumber=${page}`)
      .then((data) => {
        // Tolerate either a plain array or a { projects: [...] } wrapper.
        const raw = Array.isArray(data) ? data : (data.projects || []);
        // Defensive cap: don't trust the backend to actually honor pageSize
        // (see AdminPanel — same missing ORDER BY class of bug applies to
        // any offset/limit query without a deterministic sort).
        setProjects(raw.slice(0, pageSize));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [setError, page]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const hasMore = projects.length === pageSize;

  return (
    <div>
      <h2 style={s.sectionTitle}>Projects assigned</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
        {loading && <div style={{ color: "#9CA3AF", fontSize: 14 }}>Loading projects...</div>}
        {!loading && projects.length === 0 && (
          <div style={{ color: "#9CA3AF", fontSize: 14 }}>You haven't been assigned to any projects yet.</div>
        )}
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      {!loading && <SimplePagination page={page} hasMore={hasMore} onChange={setPage} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Status Modal
// ---------------------------------------------------------------------------

function ChangeStatusModal({ task, onClose, onUpdated, setError }) {
  useEscapeKey(onClose);
  const [selected, setSelected] = useState(task.status || "todo");
  const [saving, setSaving] = useState(false);

  const options = [
    { value: "todo", label: "To do" },
    { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" },
  ];

  async function handleAssignStatus() {
    setSaving(true);
    try {
      await apiFetch(`${API_BASE}/tasks/${task.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: selected }),
      });
      onUpdated(selected);
    } catch (e) {
      // Close this modal and surface the error in the shared ErrorModal,
      // rather than failing silently inside the status picker.
      onClose();
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Change task status</h3>
          <button onClick={onClose} className="mem-icon-btn" style={s.iconBtn} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p style={{ color: "#6B7280", fontSize: 13, marginTop: 6 }}>{task.title}</p>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => (
            <label key={opt.value} className="mem-radio-label" style={s.statusRadioRow}>
              <input
                type="radio"
                name="task-status"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <button
          onClick={handleAssignStatus}
          disabled={saving}
          className="mem-primary-btn"
          style={{ ...s.primaryBtn, width: "100%", marginTop: 20 }}
        >
          {saving ? "Assigning..." : "Assign status"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks Assigned
// ---------------------------------------------------------------------------

function TaskCard({ task, onChangeStatus }) {
  const pr = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const st = TASK_STATUS_STYLES[task.status] || TASK_STATUS_STYLES.todo;
  return (
    <div style={s.taskCard}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>{task.title}</span>
          <span style={{ background: pr.bg, color: pr.text, fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 999 }}>
            {task.priority}
          </span>
          <span style={{ background: st.bg, color: st.text, fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 999 }}>
            {st.label}
          </span>
        </div>
        <div style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>{task.description}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, fontSize: 13, color: "#4B5563" }}>
          <span>
            <Calendar size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <button onClick={() => onChangeStatus(task)} className="mem-secondary-btn" style={s.secondaryBtn}>
          Change status
        </button>
      </div>
    </div>
  );
}

function TasksAssignedView({ setError }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState(null);
  // #5/#6: page survives a refresh.
  const [page, setPage] = usePersistedState("mem.tasks.page", 1);
  const pageSize = 5;

  const loadTasks = useCallback(() => {
    setLoading(true);
    apiFetch(`${API_BASE}/memberTasks?pageNumber=${page}`)
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data.tasks || []);
        // Same defensive cap as ProjectsAssignedView — see comment there.
        setTasks(raw.slice(0, pageSize));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [setError, page]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const hasMore = tasks.length === pageSize;

  return (
    <div>
      <h2 style={s.sectionTitle}>Tasks assigned</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {loading && <div style={{ color: "#9CA3AF", fontSize: 14 }}>Loading tasks...</div>}
        {!loading && tasks.length === 0 && (
          <div style={{ color: "#9CA3AF", fontSize: 14 }}>You have no tasks assigned yet.</div>
        )}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onChangeStatus={setStatusTarget} />
        ))}
      </div>

      {!loading && <SimplePagination page={page} hasMore={hasMore} onChange={setPage} />}

      {statusTarget && (
        <ChangeStatusModal
          task={statusTarget}
          onClose={() => setStatusTarget(null)}
          setError={setError}
          onUpdated={(newStatus) => {
            setTasks((list) => list.map((t) => (t.id === statusTarget.id ? { ...t, status: newStatus } : t)));
            setStatusTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const GLOBAL_STYLES = `
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  .mem-primary-btn { transition: background 0.15s, transform 0.1s; }
  .mem-primary-btn:hover:not(:disabled) { background: #1D4ED8 !important; }
  .mem-primary-btn:active:not(:disabled) { transform: scale(0.98); }
  .mem-secondary-btn { transition: background 0.15s, border-color 0.15s; }
  .mem-secondary-btn:hover { background: #F3F4F6 !important; border-color: #9CA3AF !important; }
  .mem-project-card { transition: box-shadow 0.15s, border-color 0.15s; }
  .mem-project-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.08); border-color: #D1D5DB !important; }
  .mem-nav-item { transition: background 0.15s, color 0.15s; }
  .mem-nav-item:hover { background: #242E3D; color: #fff; }
  .mem-icon-btn { transition: background 0.15s; border-radius: 6px; }
  .mem-icon-btn:hover { background: #F3F4F6; }
  .mem-radio-label input { accent-color: #2563EB; }

  /* Same fix as AdminPanel: the shell is pinned to exactly 100vh and only
     .mem-content scrolls internally, so the page itself never grows taller
     than the screen and the last card can't get clipped off the bottom. */
  .mem-content { scrollbar-width: thin; scrollbar-color: #C7CCD4 transparent; }
  .mem-content::-webkit-scrollbar { width: 10px; }
  .mem-content::-webkit-scrollbar-track { background: transparent; }
  .mem-content::-webkit-scrollbar-thumb { background: #C7CCD4; border-radius: 8px; border: 2px solid #F5F6F8; }
  .mem-content::-webkit-scrollbar-thumb:hover { background: #A6ACB6; }

  .mem-sidebar-scroll { scrollbar-width: thin; scrollbar-color: #3A4451 transparent; }
  .mem-sidebar-scroll::-webkit-scrollbar { width: 8px; }
  .mem-sidebar-scroll::-webkit-scrollbar-thumb { background: #3A4451; border-radius: 8px; }
`;

export default function MemberPanel() {
  const { user, logout } = useAuth();
  // #3: which of the two tabs was open survives a refresh.
  const [section, setSection] = usePersistedState("mem.section", "projects");
  const [error, setError] = useState("");

  function handleLogout() {
    clearPersistedState("mem.");
    logout();
  }

  return (
    <div style={s.app}>
      <style>{GLOBAL_STYLES}</style>
      <Sidebar active={section} onSelect={setSection} username={user?.username} onLogout={handleLogout} />
      <div className="mem-content" style={s.content}>
        {section === "projects" && <ProjectsAssignedView setError={setError} />}
        {section === "tasks" && <TasksAssignedView setError={setError} />}
      </div>
      <ErrorModal message={error} onClose={() => setError("")} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles (mirrors AdminPanel's `s` object so the two panels stay visually consistent)
// ---------------------------------------------------------------------------

const s = {
  app: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    background: "#F5F6F8",
    color: "#111827",
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    height: "100vh",
    overflowY: "auto",
    background: "#1B2430",
    color: "#D1D5DB",
    padding: "24px 0",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sidebarBrand: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 500,
    padding: "0 20px 20px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "11px 20px",
    background: "transparent",
    border: "none",
    borderLeft: "3px solid transparent",
    color: "#9CA3AF",
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: {
    background: "#242E3D",
    color: "#fff",
    borderLeft: "3px solid #1D9E75",
  },
  content: {
    flex: 1,
    minWidth: 0,
    height: "100vh",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "32px 40px 56px",
    boxSizing: "border-box",
  },
  sectionTitle: { fontSize: 24, fontWeight: 500, margin: 0 },
  projectCard: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 14,
    padding: "22px 26px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  },
  infoBox: {
    background: "#F9FAFB",
    border: "1px solid #EEF0F2",
    borderRadius: 8,
    padding: "10px 14px",
  },
  taskCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: "16px 20px",
  },
  primaryBtn: {
    background: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17,24,39,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
  },
  statusRadioRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
    padding: "10px 12px",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
  },
  paginationBar: {
    display: "flex",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  pageArrow: {
    width: 32,
    height: 32,
    border: "1px solid #D1D5DB",
    background: "#fff",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};