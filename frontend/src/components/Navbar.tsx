import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="navbar">
      <div className="navbar-brand">Ivy Homes</div>
      <nav className="navbar-links">
        <NavLink to="/listings" className={({ isActive }) => (isActive ? "active" : "")}>
          Buy
        </NavLink>
        <NavLink to="/rentals" className={({ isActive }) => (isActive ? "active" : "")}>
          Rent
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => (isActive ? "active" : "")}>
          Projects
        </NavLink>
        <NavLink to="/favourites" className={({ isActive }) => (isActive ? "active" : "")}>
          Saved
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => (isActive ? "active" : "")}>
          Insights
        </NavLink>
      </nav>
      <div className="navbar-user">
        <span>{user.email}</span>
        <button onClick={logout}>Log out</button>
      </div>
    </header>
  );
}
