import "./NavBar.css";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogoutClick() {
    localStorage.removeItem("token");
    navigate("/");
  }

  const showBackButton =
    location.pathname !== "/JobsListPage" && location.pathname !== "/CrewPage";

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
