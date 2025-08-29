import { useMutation } from "@tanstack/react-query";
import { api } from "./api.js";
import './App.css';

function App() {
  const addTimeLogMutation = useMutation({
    mutationFn: (time) => api.post("/timeLog", { time }),
    onSuccess: () => {
      console.log("Time log added!");
    },
    onError: (error) => {
      const message = error?.response?.data?.error || error.message || "Unknown error";
      console.error("Error logging time:", message);
    }
  });

  function handleClick() {
    const time = new Date().toISOString();
    addTimeLogMutation.mutate(time);
  }

  return (
    <div>
      <h1>Time Tracker</h1>
      <button onClick={handleClick} disabled={addTimeLogMutation.isLoading}>
        {addTimeLogMutation.isLoading ? "Logging..." : "Log Time"}
      </button>

      {addTimeLogMutation.isSuccess && (
        <p style={{ color: "green" }}>✅ Time log added!</p>
      )}

      {addTimeLogMutation.error && (
        <p style={{ color: "red" }}>
          {addTimeLogMutation.error.response?.data?.error || addTimeLogMutation.error.message}
        </p>
      )}
    </div>
  );
}

export default App;
