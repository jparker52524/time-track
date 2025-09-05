import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import "./App.css";

function JobPage({ user }) {
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusColor, setStatusColor] = useState(null);
  const [isRunningLocal, setIsRunningLocal] = useState(false);
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ✅ Fetch job details
  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get(`/jobs/${id}`),
    enabled: !!id,
  });

  // ✅ Fetch job status for this user (open/closed)
  const { data: log } = useQuery({
    queryKey: ["jobStatus", id, user?.id],
    queryFn: () => api.get(`/jobs/${id}/status`),
    enabled: !!user,
    onSuccess: (data) => {
      if (data) setIsRunningLocal(!data.end_time); // sync from server
    },
  });

  // ✅ Mutations for start/stop
  const startMutation = useMutation({
    mutationFn: () => api.post(`/jobs/${id}/start`),
    onSuccess: () => {
      setStatusMessage("✅ Job started");
      setStatusColor("green");
      setIsRunningLocal(true);
      queryClient.invalidateQueries(["jobStatus", id, user?.id]);
    },
    onError: (err) => {
      const message = err?.message || "Error starting job";
      setStatusMessage(message);
      setStatusColor("red");
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.post(`/jobs/${id}/stop`),
    onSuccess: () => {
      setStatusMessage("✅ Job stopped");
      setStatusColor("green");
      setIsRunningLocal(false);
      queryClient.invalidateQueries(["jobStatus", id, user?.id]);
    },
    onError: (err) => {
      const message = err?.message || "Error stopping job";
      setStatusMessage(message);
      setStatusColor("red");
    },
  });

  // ✅ Handle button click (with offline queue)
  function handleClick() {
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("timeLogQueue") || "[]");
      queue.push({ jobId: id, action: isRunningLocal ? "stop" : "start" });
      localStorage.setItem("timeLogQueue", JSON.stringify(queue));

      setStatusMessage(`⏳ Offline – ${isRunningLocal ? "stop" : "start"} queued`);
      setStatusColor("orange");
      setIsRunningLocal(!isRunningLocal);
      return;
    }

    if (isRunningLocal) {
      stopMutation.mutate();
    } else {
      startMutation.mutate();
    }
  }

  // ✅ Flush queued actions when back online
  useEffect(() => {
    async function flushQueue() {
      if (!navigator.onLine) return;
      const queue = JSON.parse(localStorage.getItem("timeLogQueue") || "[]");
      if (queue.length === 0) return;

      localStorage.removeItem("timeLogQueue");

      for (const item of queue) {
        try {
          await api.post(`/jobs/${item.jobId}/${item.action}`);
          setStatusMessage(`✅ Queued ${item.action} synced!`);
          setStatusColor("green");
          queryClient.invalidateQueries(["jobStatus", item.jobId, user?.id]);
        } catch (err) {
          console.error("Failed to sync queued action:", err);
          setStatusMessage("⚠️ Failed to sync queued action");
          setStatusColor("red");
          return;
        }
      }
    }

    window.addEventListener("online", flushQueue);
    flushQueue();
    return () => window.removeEventListener("online", flushQueue);
  }, [id, queryClient, user?.id]);

  if (isLoading) return <div>Loading job...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const isRunning = log && !log.end_time;

  return (
    <div>
      <button onClick={() => navigate("/JobsListPage")}>Back</button>
      <h2>{job.name}</h2>
      <h1>Time Tracker</h1>
      <button
        className="log-time-btn"
        onClick={handleClick}
        disabled={startMutation.isLoading || stopMutation.isLoading}
      >
        {startMutation.isLoading || stopMutation.isLoading
          ? "Saving..."
          : isRunningLocal
          ? "Stop"
          : "Start"}
      </button>

      {statusMessage && (
        <p style={{ color: statusColor }}>{statusMessage}</p>
      )}
    </div>
  );
}

export default JobPage;
