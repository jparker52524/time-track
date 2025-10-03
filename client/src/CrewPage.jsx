import React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import "./CrewPage.css";
import "./JobsListPage.css";

function CrewPage({ user }) {
  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", user?.id],
    queryFn: () => api.get(`/orgusers`),
  });

  //need to change wage here

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

      <table className="crew-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Wage</th>
          </tr>
        </thead>
        <tbody>
          {orgUsers.map((orgUser) => (
            <tr key={orgUser.id}>
              <td>
                {orgUser.first_name} {orgUser.last_name}
              </td>
              <td>${orgUser.hourly_rate || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CrewPage;
