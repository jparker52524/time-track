import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, NavLink } from "react-router-dom";
import { api } from "./api";
import "./CreateOrg.css";

function CreateOrgPage() {
  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // "error" | "success"

  const navigate = useNavigate();

  const createOrgMutation = useMutation({
    mutationFn: (data) => api.post("/auth/createOrg", data),
    onSuccess: () => {
      setOrgName("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setStatusType("success");
      setStatusMessage("Organization created successfully!");
      // Optionally redirect after a short delay
      // setTimeout(() => navigate("/"), 2000);
    },
    onError: (error) => {
      setStatusType("error");
      setStatusMessage(
        error?.response?.data?.message || "Error creating organization."
      );
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatusType("error");
      setStatusMessage("Passwords do not match.");
      return;
    }
    setStatusMessage("");
    createOrgMutation.mutate({ orgName, firstName, lastName, email, password });
  }

  return (
    <>
      <div className="create-org-page">
        <h1 className="create-org-header">Create an Org</h1>
        <div className="create-org-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Organization Name"
              value={orgName}
              className="create-org-input"
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              className="create-org-input"
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              className="create-org-input"
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              className="create-org-input"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              className="create-org-input"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              className="create-org-input"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* ✅ Status message display */}
            {statusMessage && (
              <p
                className={`status-message ${
                  statusType === "error" ? "error" : "success"
                }`}
              >
                {statusMessage}
              </p>
            )}

            <button
              className="create-org-btn"
              type="submit"
              disabled={createOrgMutation.isLoading}
            >
              {createOrgMutation.isLoading ? "Creating..." : "Create"}
            </button>
          </form>
          <NavLink to="/">Back to Login</NavLink>
        </div>
      </div>
    </>
  );
}

export default CreateOrgPage;
