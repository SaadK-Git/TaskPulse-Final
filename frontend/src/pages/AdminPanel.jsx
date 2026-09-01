import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, Calendar, X, ChevronLeft, ChevronRight, Users, ListChecks, LayoutGrid, ClipboardList, UserCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePersistedState, clearPersistedState } from "../hooks/usePersistedState";

const API_BASE = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Small shared primitives
// ---------------------------------------------------------------------------

function useEscapeKey(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function ErrorModal({ message, onClose }) {
  useEscapeKey(onClose);
  if (!message) return null;
  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#B3261E" }}>Something went wrong</h3>
          <button onClick={onClose} className="adm-icon-btn" style={s.iconBtn}><X size={16} /></button>
        </div>
        <p style={{ color: "#4B5563", fontSize: 14, marginTop: 12 }}>{message}</p>
        <button onClick={onClose} className="adm-primary-btn" style={{ ...s.primaryBtn, marginTop: 16, width: "100%" }}>Close</button>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, body, confirmLabel = "Delete", onConfirm, onCancel }) {
  useEscapeKey(onCancel);
  if (!open) return null;
  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...s.modal, maxWidth: 360 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        <p style={{ color: "#4B5563", fontSize: 14, marginTop: 12 }}>{body}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} style={{ ...s.secondaryBtn, flex: 1 }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...s.dangerBtn, flex: 1 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div style={s.toast}>{message}</div>;
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const slots = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div style={s.paginationBar}>
      <button style={s.pageArrow} disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></button>
      {slots.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{ ...s.pageSlot, ...(n === page ? s.pageSlotActive : {}) }}
        >
          {n}
        </button>
      ))}
      <button style={s.pageArrow} disabled={page === totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></button>
    </div>
  );
}

// Used whenever the backend gives us a page of data but no total count —
// same pattern already used by ActivityLogView / ProjectsView / UsersView:
// just "was this page full?" determines whether Next is enabled. No
// numbered slots, since we have no idea how many pages actually exist.
// MembersView and TasksView also use this now — see the comment in those
// components for why the numbered Pagination silently disappeared there.
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

const TASK_STATUS_LABELS = { todo: "todo", in_progress: "in_progress", done: "done" };

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

const EMPTY_PROJECT_DRAFT = { name: "", description: "", status: "active", deadline: "" };
const EMPTY_TASK_DRAFT = { title: "", description: "", priority: "medium", status: "todo", due_date: "" };

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ active, onSelect, username, onLogout }) {
  const items = [
    { key: "projects", label: "Projects", icon: LayoutGrid },
    { key: "users", label: "Users", icon: Users },
    { key: "activity", label: "Activity log", icon: ClipboardList },
  ];
  return (
    <div style={s.sidebar}>
      <div style={s.sidebarBrand}>Admin</div>
      <div style={{ flex: 1 }}>
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="adm-nav-item" style={{ ...s.navItem, ...(active === key ? s.navItemActive : {}) }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div style={{ borderTop: "1px solid #2A3341", padding: "16px 20px" }}>
        {username && <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>{username}</div>}
        <button onClick={onLogout} className="adm-nav-item" style={{ ...s.navItem, padding: 0, color: "#9CA3AF" }}>
          Log out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Member Modal
// ---------------------------------------------------------------------------

function AddMemberModal({ projectId, existingMemberIds, onClose, onAdded, setError }) {
  useEscapeKey(onClose);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_BASE}/users?pageNumber=1`)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const availableUsers = users.filter((u) => !existingMemberIds.includes(u.id));

  async function handleAdd(userId) {
    try {
      await apiFetch(`${API_BASE}/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      onAdded(userId);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Add member</h3>
          <button onClick={onClose} className="adm-icon-btn" style={s.iconBtn}><X size={18} /></button>
        </div>
        <div style={{ marginTop: 16, maxHeight: 340, overflowY: "auto" }}>
          {loading && <p style={s.mutedText}>Loading users...</p>}
          {!loading && availableUsers.length === 0 && <p style={s.mutedText}>No available users to add.</p>}
          {availableUsers.map((u) => (
            <div key={u.id} style={s.userRow}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{u.username}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{u.email}</div>
              </div>
              <button onClick={() => handleAdd(u.id)} style={s.smallPrimaryBtn}>Add</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members View
// ---------------------------------------------------------------------------

function MembersView({ project, page, onPageChange, onBack, setError }) {
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);
  // Backend returns a plain page of results here (same as /projects, /users,
  // /activity/logs) with no total count — pageSize just has to match what
  // the backend actually limits to. Previously this assumed a wrapped
  // { members, total } shape and pageSize=10; when `total` never came back,
  // totalPages computed to 1 and the numbered Pagination bar quietly hid
  // itself. Fixed by switching to the same "was this page full?" pattern
  // used everywhere else in this file.
  const pageSize = 5;

  const loadMembers = useCallback(() => {
    apiFetch(`${API_BASE}/projects/members/${project.id}?pageNumber=${page}`)
      .then((data) => {
        // Tolerate either a plain array or a { members: [...] } wrapper so
        // this doesn't silently break again if the response shape changes.
        const raw = Array.isArray(data) ? data : (data.members || []);
        // Defensive cap: don't trust the backend to actually honor pageSize.
        // If it ever returns more than pageSize rows for a single page, we
        // still only show pageSize of them — extras just push to hasMore.
        setMembers(raw.slice(0, pageSize));
      })
      .catch((e) => setError(e.message));
  }, [project.id, page]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleRemove(userId) {
    try {
      await apiFetch(`${API_BASE}/projects/${project.id}/members/${userId}`, { method: "DELETE" });
      setConfirmTarget(null);
      loadMembers();
    } catch (e) {
      setError(e.message);
    }
  }

  const hasMore = members.length === pageSize;

  return (
    <div>
      <button onClick={onBack} style={s.backLink}>← Back to projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <h2 style={s.sectionTitle}>Members</h2>
        <button onClick={() => setShowAddModal(true)} className="adm-primary-btn" style={s.primaryBtn}>
          <Plus size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
          Add member
        </button>
      </div>

      <div style={s.tableWrap}>
        <div style={{ ...s.tableRow, ...s.tableHeader }}>
          <div style={{ flex: 2 }}>Name</div>
          <div style={{ flex: 1 }}>Role</div>
          <div style={{ flex: 2 }}>Email</div>
          <div style={{ width: 40 }} />
        </div>
        {members.length === 0 && <div style={{ padding: 20, color: "#9CA3AF", fontSize: 14 }}>No members on this project yet.</div>}
        {members.map((m) => (
          <div key={m.id} style={s.tableRow}>
            <div style={{ flex: 2, fontWeight: 500 }}>{m.username}</div>
            <div style={{ flex: 1 }}>{m.role}</div>
            <div style={{ flex: 2, color: "#4B5563" }}>{m.email}</div>
            <div style={{ width: 40, textAlign: "center" }}>
              <button onClick={() => setConfirmTarget(m)} className="adm-icon-btn" style={s.iconBtn} aria-label="Remove member">
                <Trash2 size={17} color="#DC2626" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <SimplePagination page={page} hasMore={hasMore} onChange={onPageChange} />

      {showAddModal && (
        <AddMemberModal
          projectId={project.id}
          existingMemberIds={members.map((m) => m.id)}
          onClose={() => setShowAddModal(false)}
          setError={setError}
          onAdded={() => {
            setShowAddModal(false);
            setToast("Member added");
            loadMembers();
          }}
        />
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title="Remove member"
        body={confirmTarget ? `Remove ${confirmTarget.username} from this project?` : ""}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => handleRemove(confirmTarget.id)}
      />

      <Toast message={toast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assign Task Modal (only users already on the project)
// ---------------------------------------------------------------------------

function AssignTaskModal({ projectId, taskId, onClose, onAssigned, setError }) {
  useEscapeKey(onClose);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_BASE}/users/project/${projectId}?pageNumber=1`)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleAssign(userId) {
    try {
      await apiFetch(`${API_BASE}/tasks/${taskId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ assigned_to: userId }),
      });
      onAssigned();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Assign to project member</h3>
          <button onClick={onClose} className="adm-icon-btn" style={s.iconBtn}><X size={18} /></button>
        </div>
        <div style={{ marginTop: 16, maxHeight: 320, overflowY: "auto" }}>
          {loading && <p style={s.mutedText}>Loading project members...</p>}
          {!loading && users.length === 0 && <p style={s.mutedText}>This project has no members yet. Add members first.</p>}
          {users.map((u) => (
            <div key={u.id} style={s.userRow}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{u.username}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{u.email}</div>
              </div>
              <button onClick={() => handleAssign(u.id)} style={s.smallPrimaryBtn}>Assign</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Task Modal
// ---------------------------------------------------------------------------

// Draft is persisted so a refresh mid-fill-out doesn't lose typed input
// (requirement #10). It's cleared on successful submit; a manual close
// (X / escape) intentionally keeps the draft so reopening the modal
// restores what was being typed.
function AddTaskModal({ projectId, currentUserId, onClose, onCreated, setError }) {
  useEscapeKey(onClose);
  const [form, setForm] = usePersistedState(`adm.taskDraft.${projectId}`, EMPTY_TASK_DRAFT);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.due_date) {
      setError("Title and due date are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`${API_BASE}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          priority: form.priority,
          status: form.status,
          due_date: new Date(form.due_date).toISOString(),
          created_by: currentUserId,
          project_id: projectId,
          assigned_to: null,
        }),
      });
      setForm(EMPTY_TASK_DRAFT);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>New task</h3>
          <button onClick={onClose} className="adm-icon-btn" style={s.iconBtn}><X size={18} /></button>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={s.input} placeholder="Task title" value={form.title} onChange={(e) => update("title", e.target.value)} />
          <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} placeholder="Description" value={form.description} onChange={(e) => update("description", e.target.value)} />
          <div style={{ display: "flex", gap: 12 }}>
            <select style={s.input} value={form.priority} onChange={(e) => update("priority", e.target.value)}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <select style={s.input} value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <input type="date" style={s.input} value={form.due_date} onChange={(e) => update("due_date", e.target.value)} />
        </div>

        <button onClick={handleSubmit} disabled={saving} className="adm-primary-btn" style={{ ...s.primaryBtn, width: "100%", marginTop: 18 }}>
          {saving ? "Creating..." : "Create task"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks View
// ---------------------------------------------------------------------------

function TasksView({ project, currentUserId, page, onPageChange, onBack, setError }) {
  const [tasks, setTasks] = useState([]);
  // Same fix as MembersView: this endpoint returns a plain page with no
  // total count, so pagination has to be inferred from "was this page
  // full?" rather than a totalPages calc that silently defaulted to 1.
  const pageSize = 5;
  // Whether the "new task" modal is open survives a refresh — reopening a
  // create modal is harmless and saves the user re-navigating to it, unlike
  // edit/assign modals below which target a specific record we'd rather
  // just re-fetch than assume is still valid (item #8).
  const [showAddModal, setShowAddModal] = usePersistedState(`adm.tasks.showAddModal.${project.id}`, false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadTasks = useCallback(() => {
    apiFetch(`${API_BASE}/projects/tasks/${project.id}?pageNumber=${page}`)
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data.tasks || []);
        // Same defensive cap as MembersView — see comment there.
        setTasks(raw.slice(0, pageSize));
      })
      .catch((e) => setError(e.message));
  }, [project.id, page]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleStatusChange(taskId, status) {
    try {
      await apiFetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(taskId) {
    try {
      await apiFetch(`${API_BASE}/tasks/${taskId}`, { method: "DELETE" });
      setConfirmTarget(null);
      loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  const hasMore = tasks.length === pageSize;

  return (
    <div>
      <button onClick={onBack} style={s.backLink}>← Back to projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <h2 style={s.sectionTitle}>Tasks</h2>
        <button onClick={() => setShowAddModal(true)} className="adm-primary-btn" style={s.primaryBtn}>
          <Plus size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
          Add task
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {tasks.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 14 }}>No tasks on this project yet.</div>}
        {tasks.map((t) => {
          const pr = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
          return (
            <div key={t.id} style={s.taskCard}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 500, fontSize: 15 }}>{t.title}</span>
                  <span style={{ background: pr.bg, color: pr.text, fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 999 }}>
                    {t.priority}
                  </span>
                </div>
                <div style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>{t.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, fontSize: 13, color: "#4B5563" }}>
                  <span><Calendar size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{new Date(t.due_date).toLocaleDateString()}</span>
                  {/*
                    #7: this always reflects what the server just returned —
                    tasks starts empty and only renders once loadTasks()
                    resolves, so there's no intermediate render where a task
                    that IS assigned briefly shows "Unassigned". If you're
                    seeing that flash in practice, it means `tasks` is being
                    pre-seeded from a stale cache somewhere upstream of this
                    component — worth checking wherever TasksView gets mounted.
                  */}
                  <span><UserCircle2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t.assigned_to ? t.assigned_to.username : "Unassigned"}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: 6,
                  fontSize: 13,
                  background: "#F9FAFB",
                }}
              >
                {t.status === "todo"
                  ? "To do"
                  : t.status === "in_progress"
                  ? "In progress"
                  : "Done"}
              </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setAssignTarget(t)} style={s.smallSecondaryBtn}>Assign</button>
                  <button onClick={() => setConfirmTarget(t)} className="adm-icon-btn" style={s.iconBtn} aria-label="Delete task">
                    <Trash2 size={16} color="#DC2626" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SimplePagination page={page} hasMore={hasMore} onChange={onPageChange} />

      {showAddModal && (
        <AddTaskModal
          projectId={project.id}
          currentUserId={currentUserId}
          onClose={() => setShowAddModal(false)}
          setError={setError}
          onCreated={() => { setShowAddModal(false); loadTasks(); }}
        />
      )}

      {assignTarget && (
        <AssignTaskModal
          projectId={project.id}
          taskId={assignTarget.id}
          onClose={() => setAssignTarget(null)}
          setError={setError}
          onAssigned={() => { setAssignTarget(null); loadTasks(); }}
        />
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title="Delete task"
        body={confirmTarget ? `Delete "${confirmTarget.title}"? This can't be undone.` : ""}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => handleDelete(confirmTarget.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

function ProjectCard({ project, onViewMembers, onViewTasks }) {
  return (
    <div className="adm-project-card" style={s.projectCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{project.name}</div>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        <div style={{ ...s.infoBox, flex: 2 }}>
          <span style={{ color: "#6B7280", fontSize: 13 }}>Description</span>
          <div style={{ marginTop: 4, fontSize: 14 }}>{project.description}</div>
        </div>
        <div style={{ ...s.infoBox, flex: 1 }}>
          <span style={{ color: "#6B7280", fontSize: 13 }}><Calendar size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Deadline</span>
          <div style={{ marginTop: 4, fontSize: 14 }}>{new Date(project.deadline).toLocaleDateString()}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <button onClick={() => onViewMembers(project)} className="adm-secondary-btn" style={s.secondaryBtn}>View members</button>
        <button onClick={() => onViewTasks(project)} className="adm-primary-btn" style={s.primaryBtn}>View tasks</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Project Modal
// ---------------------------------------------------------------------------

function CreateProjectModal({ ownerId, onClose, onCreated, setError }) {
  useEscapeKey(onClose);
  const [form, setForm] = usePersistedState("adm.projectDraft", EMPTY_PROJECT_DRAFT);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.deadline) {
      setError("Project name and deadline are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`${API_BASE}/projects`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          status: form.status,
          deadline: new Date(form.deadline).toISOString(),
          owner_id: ownerId,
        }),
      });
      setForm(EMPTY_PROJECT_DRAFT);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.modal, maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>New project</h3>
          <button onClick={onClose} className="adm-icon-btn" style={s.iconBtn}><X size={18} /></button>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={s.input} placeholder="Project name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} placeholder="Description" value={form.description} onChange={(e) => update("description", e.target.value)} />
          <select style={s.input} value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
          <input type="date" style={s.input} value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
        </div>

        <button onClick={handleSubmit} disabled={saving} className="adm-primary-btn" style={{ ...s.primaryBtn, width: "100%", marginTop: 18 }}>
          {saving ? "Creating..." : "Create project"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects View
// ---------------------------------------------------------------------------

function ProjectsView({ currentUserId, onViewMembers, onViewTasks, setError }) {
  const [projects, setProjects] = useState([]);
  const [page, setPage] = usePersistedState("adm.projects.page", 1);
  const [status, setStatus] = usePersistedState("adm.projects.status", "active");
  const [showCreateModal, setShowCreateModal] = usePersistedState("adm.projects.showCreateModal", false);
  const pageSize = 5;

  const loadProjects = useCallback(() => {
    apiFetch(`${API_BASE}/projects?pageNumber=${page}&status=${status}`)
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        // Same defensive cap as MembersView/TasksView — see comment there.
        // This is what stops a 6th project from ever rendering on a page
        // sized for 5, even if the backend's own limit is off by one.
        setProjects(raw.slice(0, pageSize));
      })
      .catch((e) => setError(e.message));
  }, [page, status]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // The /projects endpoint returns a plain list with no total count, so we
  // can't compute real "total pages" — instead: if this page came back full
  // (== pageSize items), assume there might be another page.
  const hasMore = projects.length === pageSize;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={s.sectionTitle}>Projects</h2>
        <button onClick={() => setShowCreateModal(true)} className="adm-primary-btn" style={s.primaryBtn}>
          <Plus size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
          Create project
        </button>
      </div>
      <div style={s.filterBar}>
        {["active", "on_hold", "completed"].map((val) => (
          <label key={val} className="adm-radio-label" style={s.radioLabel}>
            <input
              type="radio"
              name="status"
              checked={status === val}
              onChange={() => { setStatus(val); setPage(1); }}
            />
            {STATUS_STYLES[val].label}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
        {projects.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 14 }}>No projects match this filter.</div>}
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onViewMembers={onViewMembers} onViewTasks={onViewTasks} />
        ))}
      </div>

      <SimplePagination page={page} hasMore={hasMore} onChange={setPage} />

      {showCreateModal && (
        <CreateProjectModal
          ownerId={currentUserId}
          onClose={() => setShowCreateModal(false)}
          setError={setError}
          onCreated={() => { setShowCreateModal(false); loadProjects(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users View (top-level, non-admin users)
// ---------------------------------------------------------------------------

function UsersView({ setError }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = usePersistedState("adm.users.page", 1);
  const pageSize = 5; // matches the backend's typical .limit(5) — adjust if /users uses a different page size

  useEffect(() => {
    apiFetch(`${API_BASE}/users?pageNumber=${page}`)
      .then((data) => setUsers((Array.isArray(data) ? data : []).slice(0, pageSize)))
      .catch((e) => setError(e.message));
  }, [page]);

  async function toggleActive(user) {
    try {
      await apiFetch(`${API_BASE}/users/${user.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)));
    } catch (e) {
      setError(e.message);
    }
  }

  // Same fix as ProjectsView: no total count comes back from /users, so
  // "hasMore" is inferred from whether this page was full.
  const hasMore = users.length === pageSize;

  return (
    <div>
      <h2 style={s.sectionTitle}>Users</h2>
      <div style={s.tableWrap}>
        <div style={{ ...s.tableRow, ...s.tableHeader }}>
          <div style={{ flex: 2 }}>Name</div>
          <div style={{ flex: 1 }}>Role</div>
          <div style={{ flex: 2 }}>Email</div>
          <div style={{ flex: 1 }}>Status</div>
        </div>
        {users.length === 0 && <div style={{ padding: 20, color: "#9CA3AF", fontSize: 14 }}>No users found.</div>}
        {users.map((u) => (
          <div key={u.id} style={s.tableRow}>
            <div style={{ flex: 2, fontWeight: 500 }}>{u.username}</div>
            <div style={{ flex: 1 }}>{u.role}</div>
            <div style={{ flex: 2, color: "#4B5563" }}>{u.email}</div>
            <div style={{ flex: 1 }}>
              <button
                onClick={() => toggleActive(u)}
                style={{ ...s.smallSecondaryBtn, color: u.is_active ? "#27500A" : "#993C1D" }}
              >
                {u.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <SimplePagination page={page} hasMore={hasMore} onChange={setPage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Log View (placeholder — no backend infra supplied yet)
// ---------------------------------------------------------------------------

const ACTION_LABELS = {
  CREATE_PROJECT: "created project",
  UPDATE_PROJECT_STATUS: "updated project status",
  CREATE_TASK: "created task",
};

function ActivityLogView({ currentUserId, setError }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = usePersistedState("adm.activity.page", 1);
  const pageSize = 5;

  useEffect(() => {
    if (!currentUserId) return;
    apiFetch(`${API_BASE}/activity/logs/${currentUserId}?page=${page}`)
      .then((data) => setLogs((Array.isArray(data) ? data : []).slice(0, pageSize)))
      .catch((e) => setError(e.message));
  }, [currentUserId, page]);

  return (
    <div>
      <h2 style={s.sectionTitle}>Activity log</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {logs.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 14 }}>No activity recorded yet.</div>}
        {logs.map((log) => (
          <div key={log.id} style={s.activityRow}>
            <div style={s.activityDot} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{ACTION_LABELS[log.action] || log.action.toLowerCase().replaceAll("_", " ")}</strong>
                {log.detail && <span style={{ color: "#6B7280" }}> — {log.detail}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                {log.entity_type} #{log.entity_id} · {new Date(log.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <SimplePagination page={page} hasMore={logs.length === pageSize} onChange={setPage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------

const GLOBAL_STYLES = `
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  .adm-primary-btn { transition: background 0.15s, transform 0.1s; }
  .adm-primary-btn:hover:not(:disabled) { background: #1D4ED8 !important; }
  .adm-primary-btn:active:not(:disabled) { transform: scale(0.98); }
  .adm-secondary-btn { transition: background 0.15s, border-color 0.15s; }
  .adm-secondary-btn:hover { background: #F3F4F6 !important; border-color: #9CA3AF !important; }
  .adm-project-card { transition: box-shadow 0.15s, border-color 0.15s; }
  .adm-project-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.08); border-color: #D1D5DB !important; }
  .adm-nav-item { transition: background 0.15s, color 0.15s; }
  .adm-nav-item:hover { background: #242E3D; color: #fff; }
  .adm-icon-btn { transition: background 0.15s; border-radius: 6px; }
  .adm-icon-btn:hover { background: #F3F4F6; }
  .adm-radio-label input { accent-color: #2563EB; }

  /* Scrollable content pane — this is what actually fixes the last card
     being clipped off the bottom of the viewport. See s.app / s.sidebar /
     s.content below: the outer app shell is pinned to exactly 100vh and
     only .adm-content scrolls internally, so the page itself never grows
     taller than the screen and nothing gets cut off. */
  .adm-content { scrollbar-width: thin; scrollbar-color: #C7CCD4 transparent; }
  .adm-content::-webkit-scrollbar { width: 10px; }
  .adm-content::-webkit-scrollbar-track { background: transparent; }
  .adm-content::-webkit-scrollbar-thumb { background: #C7CCD4; border-radius: 8px; border: 2px solid #F5F6F8; }
  .adm-content::-webkit-scrollbar-thumb:hover { background: #A6ACB6; }

  .adm-sidebar-scroll { scrollbar-width: thin; scrollbar-color: #3A4451 transparent; }
  .adm-sidebar-scroll::-webkit-scrollbar { width: 8px; }
  .adm-sidebar-scroll::-webkit-scrollbar-thumb { background: #3A4451; border-radius: 8px; }
`;

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const currentUserId = user?.id;

  // Which top-level section, and (if we've drilled into a project) which
  // tab + which project — this is what makes "stay on the exact page you
  // were on" (req #3) and "remember the open project + tab" (req #4) work
  // across a refresh. We persist the project object itself (not just its
  // id) so the header can render immediately without a flash of empty
  // state; MembersView/TasksView still re-fetch their list data fresh on
  // mount, so the data itself is never stale — only the project's own
  // name/description/deadline could theoretically lag if it changed
  // elsewhere, which is an acceptable tradeoff for zero extra API calls.
  const [section, setSection] = usePersistedState("adm.section", "projects");
  const [drillView, setDrillView] = usePersistedState("adm.drillView", null); // { type: 'members'|'tasks', project }
  const [membersPage, setMembersPage] = usePersistedState(
    drillView?.type === "members" ? `adm.members.page.${drillView.project.id}` : "adm.members.page.none",
    1
  );
  const [tasksPage, setTasksPage] = usePersistedState(
    drillView?.type === "tasks" ? `adm.tasks.page.${drillView.project.id}` : "adm.tasks.page.none",
    1
  );
  const [error, setError] = useState("");

  function handleSelect(key) {
    setSection(key);
    setDrillView(null);
  }

  function handleLogout() {
    clearPersistedState("adm.");
    logout();
  }

  return (
    <div style={s.app}>
      <style>{GLOBAL_STYLES}</style>
      <Sidebar active={section} onSelect={handleSelect} username={user?.username} onLogout={handleLogout} />
      <div className="adm-content" style={s.content}>
        {section === "projects" && !drillView && (
          <ProjectsView
            currentUserId={currentUserId}
            setError={setError}
            onViewMembers={(project) => setDrillView({ type: "members", project })}
            onViewTasks={(project) => setDrillView({ type: "tasks", project })}
          />
        )}
        {section === "projects" && drillView?.type === "members" && (
          <MembersView
            project={drillView.project}
            page={membersPage}
            onPageChange={setMembersPage}
            onBack={() => setDrillView(null)}
            setError={setError}
          />
        )}
        {section === "projects" && drillView?.type === "tasks" && (
          <TasksView
            project={drillView.project}
            currentUserId={currentUserId}
            page={tasksPage}
            onPageChange={setTasksPage}
            onBack={() => setDrillView(null)}
            setError={setError}
          />
        )}
        {section === "users" && <UsersView setError={setError} />}
        {section === "activity" && <ActivityLogView currentUserId={currentUserId} setError={setError} />}
      </div>
      <ErrorModal message={error} onClose={() => setError("")} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
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
  filterBar: {
    display: "flex",
    gap: 20,
    marginTop: 16,
    paddingBottom: 16,
    borderBottom: "1px solid #E5E7EB",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
  },
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
  smallPrimaryBtn: {
    background: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  smallSecondaryBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#DC2626",
    color: "#fff",
    border: "none",
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
  backLink: {
    background: "none",
    border: "none",
    color: "#2563EB",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  },
  tableWrap: {
    marginTop: 16,
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid #F0F1F3",
    fontSize: 14,
  },
  tableHeader: {
    background: "#F9FAFB",
    color: "#6B7280",
    fontWeight: 500,
    fontSize: 13,
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
  pageSlot: {
    minWidth: 32,
    height: 32,
    border: "1px solid #D1D5DB",
    background: "#fff",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
  },
  pageSlotActive: {
    background: "#2563EB",
    color: "#fff",
    borderColor: "#2563EB",
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
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 4px",
    borderBottom: "1px solid #F0F1F3",
  },
  input: {
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    flex: 1,
    outline: "none",
  },
  mutedText: { color: "#9CA3AF", fontSize: 14 },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#111827",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    zIndex: 1100,
  },
  activityRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "14px 16px",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2563EB",
    marginTop: 6,
    flexShrink: 0,
  },
};