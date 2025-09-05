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
                 <button className="logout-btn" onClick={handleLogoutClick}>
                    <span className="logout-text">LOGOUT</span>
                    <FiLogOut className="logout-icon" />
                </button>
        </div>
    </>
}

export default NavBar;