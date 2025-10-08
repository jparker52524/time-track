import "./NavBar.css";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";

function NavBar({ user, setAddJobOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogoutClick() {
    localStorage.removeItem("token");
    navigate("/");
  }

  const showBackButton =
    location.pathname !== "/JobsListPage" && location.pathname !== "/CrewPage";

  const showAddJobButton =
    location.pathname === "/JobsListPage" && user.is_admin;

  return (
    <>
      <div className="navbar-container">
        <div className="navbar-btn-container">
          <div className="btn-container">
            {showBackButton && (
              <button
                className="back-btn"
                onClick={() => navigate("/JobsListPage")}
              >
                Back
              </button>
            )}
            {showAddJobButton && (
              <button className="add-btn" onClick={() => setAddJobOpen(true)}>
                Add Job
              </button>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogoutClick}>
            <span className="logout-text">LOGOUT</span>
            <FiLogOut className="logout-icon" />
          </button>
        </div>
      </div>
    </>
  );
}

export default NavBar;
