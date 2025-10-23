import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import { MdSave } from "react-icons/md";
import Modal from "./Modal.jsx";
import "./CrewPage.css";
import "./JobsListPage.css";

function CrewPage({ user, setAddUserOpen, isAddUserOpen }) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [wagesInput, setWagesInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // "success" | "error"

  // ✅ Mutation to add user to org
  const addUserMutation = useMutation({
    mutationFn: (data) => api.post("/auth/addUser", data),
    onSuccess: () => {
      setFirstName("");
      setLastName("");
      setEmail("");
      setWagesInput("");
      setIsAdmin(false);
      setStatusType("success");
      setStatusMessage("User added successfully!");
      queryClient.invalidateQueries(["orgUsers", user?.id]);
    },
    onError: (error) => {
      console.error("Error adding user:", error);
      setStatusType("error");
      setStatusMessage(error?.response?.data?.error || "Failed to add user.");
    },
  });

  // ✅ Handle Add User
  function handleAddUser() {
    if (!firstName || !lastName || !email) {
      setStatusType("error");
      setStatusMessage("Please fill in all fields.");
      return;
    }

    const newUser = {
      org_id: user?.org_id,
      email,
      first_name: firstName,
      last_name: lastName,
      is_admin: isAdmin,
      hourly_rate: parseFloat(wagesInput),
    };

    addUserMutation.mutate(newUser);
  }

  // ✅ Fetch org users
  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", user?.id],
    queryFn: () => api.get(`/orgusers`),
  });

  // ✅ Wage editing
  const [wages, setWages] = useState({});
  const updateWageMutation = useMutation({
    mutationFn: ({ id, hourly_rate }) =>
      api.patch(`/users/${id}`, { hourly_rate }),
    onSuccess: () => {
      queryClient.invalidateQueries(["orgUsers", user?.id]);
    },
  });

  const handleWageChange = (id, value) =>
    setWages((prev) => ({ ...prev, [id]: value }));

  const handleSave = (id) => {
    const newWage = wages[id];
    if (newWage !== undefined && newWage !== "") {
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

      {/* Crew Table */}
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
      {/* Add User Modal */}
      <Modal
        title="Add User"
        isOpen={isAddUserOpen}
        onClose={() => setAddUserOpen(false)}
      >
        <div className="jobs-list-modal-input-container">
          {/* First Name */}
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter User First Name..."
            className="jobs-list-modal-input"
            required
          />

          {/* Last Name */}
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter User Last Name..."
            className="jobs-list-modal-input"
            required
          />

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter User Email..."
            className="jobs-list-modal-input"
            required
          />

          {/* Wage */}
          <input
            type="number"
            step="0.01"
            value={wagesInput ?? ""}
            onChange={(e) => setWagesInput(e.target.value)}
            placeholder="Enter Hourly Rate..."
            className="jobs-list-modal-input"
            required
          />

          {/* Admin Selector */}
          <select
            value={isAdmin}
            onChange={(e) => setIsAdmin(e.target.value === "true")}
            className="jobs-list-modal-input"
          >
            <option value="false">Worker</option>
            <option value="true">Admin</option>
          </select>

          {/* Status Message */}
          {statusMessage && (
            <p
              className={`status-message ${
                statusType === "error" ? "error" : "success"
              }`}
            >
              {statusMessage}
            </p>
          )}

          {/* Add Button */}
          <button
            onClick={handleAddUser}
            className="jobs-list-modal-button"
            disabled={addUserMutation.isLoading}
          >
            {addUserMutation.isLoading ? "Adding..." : "Add"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default CrewPage;
