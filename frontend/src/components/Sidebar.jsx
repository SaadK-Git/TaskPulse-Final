import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ links }) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">TP</div>
        <span className="sidebar__brand-name">TaskPulse</span>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__footer">
        <span className="sidebar__user-name">{user?.name}</span>
        <span className="sidebar__user-role">{user?.role}</span>
        <button className="btn btn--link sidebar__logout" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
