import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, NavLink } from "react-router-dom";
import { api } from "./api";
import "./Login.css";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (data) => api.post("/auth/login", data),
    onSuccess: (res) => {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      onLogin(res.user);
      navigate("/JobsListPage");
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <>
      <div className="login-page">
        <h1 className="login-header">Login</h1>
        <div className="login-container">
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              className="login-input"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              className="login-input"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {loginMutation.isError && (
              <p className="login-error">Invalid email or password</p>
            )}
            <button
              className="login-btn"
              type="submit"
              disabled={loginMutation.isLoading}
            >
              {loginMutation.isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div>
            <NavLink to="/SignUpPage">Sign Up</NavLink>
            <span className="separator">or</span>
            <NavLink to="/CreateOrgPage">Create an Org</NavLink>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
