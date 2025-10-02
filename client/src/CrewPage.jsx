import React from "react";
import { NavLink } from "react-router-dom";
import "./CrewPage.css";
import "./JobsListPage.css";

function CrewPage({ user }) {
  return (
    <div className="crewPage">
      <h1 className="JobsListPage-header nav-header">
        <NavLink to="/JobsListPage" className="nav-link">
          Job Page
        </NavLink>
        <NavLink
          to="/CrewPage"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Crew Page
        </NavLink>
      </h1>

      {/* You can add the rest of your CrewPage content here */}
    </div>
  );
}

export default CrewPage;
