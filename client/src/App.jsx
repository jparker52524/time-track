import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "./NavBar.jsx";
import LoginPage from "./LoginPage.jsx";
import JobsListPage from "./JobsListPage.jsx";
import JobPage from "./JobPage.jsx";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const Layout = () => (
    <>
      <NavBar user={user}/>
      <Outlet />
    </>
  );

  return (<>
    <BrowserRouter>
      <Routes>
        {/* Public login page */}
        <Route path="/" element={<LoginPage onLogin={setUser} />} />

        {/* Protected routes with navbar */}
        <Route element={<Layout />}>
          <Route
            path="/JobsListPage"
            element={user ? <JobsListPage user={user} /> : <Navigate to="/" />}
          />
          <Route
            path="/JobPage/:id"
            element={user ? <JobPage user={user} /> : <Navigate to="/" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </>);
}

export default App;