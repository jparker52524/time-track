import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import "./App.css";

function App() {
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusColor, setStatusColor] = useState(null);

  // ✅ Mutation to send a log to server
  const addTimeLogMutation = useMutation({
    mutationFn: (time) => api.post("/timeLog", { time }),
    onSuccess: () => {
      console.log("Time log added!");
      setStatusMessage("✅ Time log added!");
      setStatusColor("green");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.error || error.message || "Unknown error";
      console.error("Error logging time:", message);
      setStatusMessage(message);
      setStatusColor("red");
    },
  });

  // ✅ Queue logs offline
  function handleClick() {
    const time = new Date().toISOString();

    if (!navigator.onLine) {
      // Save to localStorage queue
      const queue = JSON.parse(localStorage.getItem("timeLogQueue") || "[]");
      queue.push(time);
      localStorage.setItem("timeLogQueue", JSON.stringify(queue));

      setStatusMessage("⏳ Offline – log queued");
      setStatusColor("orange");
      console.log("Offline, queued:", time);
      return;
    }

    addTimeLogMutation.mutate(time);
  }

  // ✅ Try to flush queued logs when online
  useEffect(() => {
    async function flushQueue() {
      if (!navigator.onLine) return;

      const queue = JSON.parse(localStorage.getItem("timeLogQueue") || "[]");
      if (queue.length === 0) return;

      console.log("Flushing queued logs:", queue);
      for (const time of queue) {
        try {
          await api.post("/timeLog", { time });
          setStatusMessage("✅ Queued log synced!");
          setStatusColor("green");
        } catch (err) {
          console.error("Failed to sync queued log:", err);
          setStatusMessage("⚠️ Failed to sync queued log");
          setStatusColor("red");
          return;
        }
      }

      // Clear queue after successful sync
      localStorage.removeItem("timeLogQueue");
    }

    window.addEventListener("online", flushQueue);
    flushQueue(); // also run once when mounted

    return () => window.removeEventListener("online", flushQueue);
  }, []);

  return (
    <div>
      <h1>Time Tracker</h1>
      <button className="log-time-btn" onClick={handleClick} disabled={addTimeLogMutation.isLoading}>
        {addTimeLogMutation.isLoading ? "Logging..." : "Log Time"}
      </button>

      {statusMessage && (
        <p style={{ color: statusColor }}>{statusMessage}</p>
      )}
    </div>
  );
}

export default App;
