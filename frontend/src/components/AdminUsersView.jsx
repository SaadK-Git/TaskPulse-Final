import { useCallback, useEffect, useState } from "react";
import { getAllUsers, normalizeList, activateUser, deactivateUser } from "../api/admin";
import { usePersistedState } from "../hooks/usePersistedState";
import { useErrorModal } from "../context/ErrorModalContext";
import UserCard from "./UserCard";

const PAGE_SIZE = 10;

export default function AdminUsersView() {
  const { reportError } = useErrorModal();
  const [page, setPage] = usePersistedState("adm.users.page", 1);
  const [activeOnly, setActiveOnly] = usePersistedState("adm.users.active", true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getAllUsers({ page, pageSize: PAGE_SIZE, activeOnly })
      .then((data) => {
        const { items, total: t } = normalizeList(data);
        setUsers(items);
        setTotal(t);
      })
      .catch((err) => reportError(err, "Couldn't load users"))
      .finally(() => setLoading(false));
  }, [page, activeOnly, reportError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(user, currentlyActive) {
    if (currentlyActive) {
      await deactivateUser(user.id);
    } else {
      await activateUser(user.id);
    }
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Everyone with a TaskPulse account.</p>
        </div>
        <div className="field">
          <label htmlFor="user-state-filter">Status</label>
          <select
            id="user-state-filter"
            value={activeOnly ? "active" : "inactive"}
            onChange={(e) => {
              setPage(1);
              setActiveOnly(e.target.value === "active");
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users match this filter.</div>
      ) : (
        <div className="stack-users">
          {users.map((user) => (
            <UserCard key={user.id} user={user} onToggle={handleToggle} onError={reportError} />
          ))}
        </div>
      )}

      <div className="pagination">
        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="mono">
          Page {page}
          {total ? ` \u00b7 ${total} total` : ""}
        </span>
        <button
          className="btn btn--ghost"
          disabled={users.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
