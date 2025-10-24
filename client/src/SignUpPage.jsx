import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, NavLink } from "react-router-dom";
import { api } from "./api";
import "./SignUpPage.css";

function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // "error" | "success"
  const navigate = useNavigate();

  const signupMutation = useMutation({
    mutationFn: (data) => api.patch("/auth/signup", data),
    onSuccess: (res) => {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setStatusType("success");
      setStatusMessage("Sign up successful!");

      // Optional redirect after short delay
      //setTimeout(() => navigate("/JobsListPage"), 1500);
    },
    onError: (error) => {
      setStatusType("error");
      const msg =
        error?.response?.data?.message ||
        "User email does not exist or sign up failed.";
      setStatusMessage(msg);
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
    signupMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      password,
      email,
    });
  }

  return (
    <>
      <div className="signup-page">
        <h1 className="signup-header">Sign Up</h1>
        <div className="signup-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              className="signup-input"
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              className="signup-input"
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              className="signup-input"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              className="signup-input"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              className="signup-input"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* ✅ Status Message */}
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
              className="signup-btn"
              type="submit"
              disabled={signupMutation.isLoading}
            >
              {signupMutation.isLoading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
          <NavLink to="/">Back to Login</NavLink>
        </div>
      </div>
    </>
  );
}

export default SignUpPage;
