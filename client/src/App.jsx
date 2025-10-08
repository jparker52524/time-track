import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "./NavBar.jsx";
import LoginPage from "./LoginPage.jsx";
import JobsListPage from "./JobsListPage.jsx";
import CrewPage from "./CrewPage.jsx";
import JobPage from "./JobPage.jsx";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [isAddJobOpen, setAddJobOpen] = useState(false);
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setRehydrated(true); // done checking
  }, []);

  const Layout = () => (
    <>
      <NavBar user={user} setAddJobOpen={setAddJobOpen} />
      <Outlet />
    </>
  );

  if (!rehydrated) {
    return <div>Loading...</div>; // or spinner
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public login page */}
        <Route path="/" element={<LoginPage onLogin={setUser} />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route
            path="/JobsListPage"
            element={
              user ? (
                <JobsListPage
                  user={user}
                  isAddJobOpen={isAddJobOpen}
                  setAddJobOpen={setAddJobOpen}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/CrewPage"
            element={user ? <CrewPage user={user} /> : <Navigate to="/" />}
          />
          <Route
            path="/JobPage/:id"
            element={user ? <JobPage user={user} /> : <Navigate to="/" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
