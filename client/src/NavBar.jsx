import "./NavBar.css";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";

function NavBar() {

    const navigate = useNavigate();

    function handleLogoutClick() {
        localStorage.removeItem("token");
        navigate("/");
    }

    return <>
        <div className="navbar-container">
            <div className="navbar-btn-container">
                  <div className="btn-container">
                    <button className="back-btn" onClick={() => navigate("/JobsListPage")}>Back</button>
                 </div>
                 <button className="logout-btn" onClick={handleLogoutClick}>
                    <span className="logout-text">LOGOUT</span>
                    <FiLogOut className="logout-icon" />
                </button>
            </div>
        </div>
    </>
}

export default NavBar;