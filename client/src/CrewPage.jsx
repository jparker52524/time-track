// CrewPage.jsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import { MdSave } from "react-icons/md";
import "./CrewPage.css";
import "./JobsListPage.css";

function CrewPage({ user }) {
  const queryClient = useQueryClient();

  // Fetch org users
  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", user?.id],
    queryFn: () => api.get(`/orgusers`), // assume this returns org users with hourly_rate
  });

  // Local state for tracking wage edits
  const [wages, setWages] = useState({});

  // Mutation for updating the wage
  const updateWageMutation = useMutation({
    mutationFn: ({ id, hourly_rate }) =>
      api.patch(`/users/${id}`, { hourly_rate }), // PATCH to /users/:id
    onSuccess: () => {
      queryClient.invalidateQueries(["orgUsers", user?.id]); // Refetch data
    },
  });

  const handleWageChange = (id, value) => {
    setWages((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSave = (id) => {
    const newWage = wages[id];
    if (newWage !== undefined && newWage !== "") {
      console.log("Saving wage for user ID:", id, "New wage:", newWage);
      updateWageMutation.mutate({ id, hourly_rate: parseFloat(newWage) });
      alert("New wage saved.");
    }
  };

  return (
    <div>
      <h1 className="JobsListPage-header nav-header">
        <NavLink to="/JobsListPage" className="nav-link">
          Jobs
        </NavLink>
        <NavLink
          to="/CrewPage"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Crew
        </NavLink>
      </h1>

      <table className="crew-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Wage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgUsers.map((orgUser) => (
            <tr key={orgUser.id}>
              <td>
                {orgUser.first_name} {orgUser.last_name}
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={
                    wages[orgUser.id] !== undefined
                      ? wages[orgUser.id]
                      : orgUser.hourly_rate || ""
                  }
                  onChange={(e) => handleWageChange(orgUser.id, e.target.value)}
                  placeholder="Enter wage"
                />
              </td>
              <td>
                <button
                  className="icon-btn"
                  onClick={() => handleSave(orgUser.id)}
                  disabled={updateWageMutation.isLoading}
                  title="Save"
                >
                  {updateWageMutation.isLoading ? (
                    <span className="saving-text">...</span>
                  ) : (
                    <MdSave size={20} />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CrewPage;
