import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import Modal from "./Modal.jsx";
import "./JobPage.css";

function JobPage({ user }) {
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusColor, setStatusColor] = useState(null);
  const [isRunningLocal, setIsRunningLocal] = useState(false);
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // state for modal
  const [isNotesOpen, setNotesOpen] = useState(false);
  const [isCostsOpen, setCostsOpen] = useState(false);
  const [isAttachmentsOpen, setAttachmentsOpen] = useState(false);
  const [isDescriptionOpen, setDescriptionOpen] = useState(false);
  const [isOverviewOpen, setOverviewOpen] = useState(false);

  const { data: notes } = useQuery({
    queryKey: ["notes", id],
    queryFn: () => api.get(`/jobs/${id}/notes`),
  });
  const [newNote, setNewNote] = useState("");

  const { data: costs } = useQuery({
    queryKey: ["costs", id],
    queryFn: () => api.get(`/jobs/${id}/costs`),
  });
  const [newCostText, setNewCostText] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");

  const [attachments, setAttachments] = useState([
    { header: "Blueprint", url: "https://example.com/blueprint.png" },
  ]);
  const [newAttachHeader, setNewAttachHeader] = useState("");
  const [newAttachUrl, setNewAttachUrl] = useState("");
  // state for modal end

  // handlers for modal
  const addNoteMutation = useMutation({
    mutationFn: (newNote) => api.post(`/jobs/${id}/notes`, newNote),
    onSuccess: () => {
      queryClient.invalidateQueries(["notes", id]);
      setNewNote("");
    },
  });

  const addNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({ userId: user.id, note: newNote });
  };

  const addCostMutation = useMutation({
    mutationFn: (newCost) => api.post(`/jobs/${id}/costs`, newCost),
    onSuccess: () => {
      queryClient.invalidateQueries(["costs", id]);
      setNewCostText("");
      setNewCostAmount("");
    },
  });

  const addCost = () => {
    if (!newCostText.trim() || !newCostAmount) return;
    addCostMutation.mutate({
      userId: user.id,
      description: newCostText,
      amount: parseFloat(newCostAmount),
    });
  };

  const addAttachment = () => {
    if (!newAttachHeader.trim() || !newAttachUrl.trim()) return;
    setAttachments([
      ...attachments,
      { header: newAttachHeader, url: newAttachUrl },
    ]);
    setNewAttachHeader("");
    setNewAttachUrl("");
  };
  // handlers for modal

  // ✅ Fetch job details
  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get(`/jobs/${id}`),
    enabled: !!id,
  });

  // // Redirect if forbidden
  // useEffect(() => {
  //   if (isError && error.message?.includes("403")) {
  //     navigate("/");
  //   }
  // }, [isError, error, navigate]);

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
      setStatusMessage("✅ Time Started");
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
      setStatusMessage("✅ Time Stopped");
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

      setStatusMessage(
        `⏳ Offline – ${isRunningLocal ? "stop" : "start"} queued`
      );
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

  // check if a job is still running (button will say start or stop)
  const { data: jobStatusData, isLoading: statusLoading } = useQuery({
    queryKey: ["jobStatus", id, user?.id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}/status`);
      return res; // either null or { id, start_time, end_time, ... }
    },
    enabled: !!id && !!user?.id,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (jobStatusData !== undefined) {
      setIsRunningLocal(jobStatusData && jobStatusData.end_time === null);
    }
  }, [jobStatusData]);

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

  // Makes status message dissapear after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 3000); // 3 seconds

      return () => clearTimeout(timer); // cleanup if message changes earlier
    }
  }, [statusMessage]);

  //total material job cost
  const totalCost =
    costs &&
    costs.reduce((sum, cost) => {
      const amount = parseFloat(cost.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

  const formattedTotalCost = totalCost?.toFixed(2) ?? "0.00";

  const { data: laborCosts = [] } = useQuery({
    queryKey: ["laborCosts", id],
    queryFn: () => api.get(`/jobs/${id}/labor-costs`),
    enabled: !!id,
  });

  const totalLaborCost = laborCosts.reduce((sum, user) => {
    return sum + (parseFloat(user.labor_cost) || 0);
  }, 0);

  const formattedTotalLaborCost = totalLaborCost.toFixed(2);

  // camera photo upload
  function handleCameraUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAttachUrl(reader.result); // Sets the image as a base64 data URL
    };
    reader.readAsDataURL(file);
  }

  // toggle job status
  const toggleJobStatus = async () => {
    try {
      const res = await api.post(`/jobs/${job.id}/toggleStatus`, {});

      // If using your custom api client, this is already parsed
      queryClient.invalidateQueries(["job", id]);
    } catch (err) {
      console.error("Failed to toggle job status", err);
    }
  };

  // get users
  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", user?.id],
    queryFn: () => api.get(`/orgusers`),
  });

  if (isLoading) return <div>Loading job...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="JobPage">
      <h1 className="job-page-header">{job.name}</h1>
      <p className="job-location">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          📍{job.location}
        </a>
      </p>
      {/*<div className="job-description-wrapper">
        <div className="job-page-label">Job Description:</div>
        <p className="job-description-box">{job.description}</p>
      </div>*/}
      <div className="action-btn-container">
        <button
          className="action-btn"
          onClick={(e) => {
            if (
              window.confirm(
                "Are you sure you want to change this job's status?"
              )
            ) {
              toggleJobStatus(e);
            }
          }}
        >
          Status - {job.is_closed ? "Closed" : "Open"}
        </button>
        {user.is_admin && (
          <button className="action-btn" onClick={() => setOverviewOpen(true)}>
            Overview
          </button>
        )}
        <button className="action-btn" onClick={() => setDescriptionOpen(true)}>
          Description
        </button>
        <button className="action-btn" onClick={() => setNotesOpen(true)}>
          Notes
        </button>
        <button className="action-btn" onClick={() => setCostsOpen(true)}>
          Costs
        </button>
        <button className="action-btn" onClick={() => setAttachmentsOpen(true)}>
          Attachment
        </button>
      </div>
      <div className="log-time-container">
        {/*statusMessage && (
          <p className="status-msg" style={{ color: statusColor }}>
            {statusMessage}
          </p>
        )*/}

        <button
          className={`log-time-btn ${isRunningLocal ? "stop" : "start"}`}
          onClick={handleClick}
          disabled={startMutation.isLoading || stopMutation.isLoading}
        >
          {startMutation.isLoading || stopMutation.isLoading
            ? "Saving..."
            : isRunningLocal
              ? "Stop Time"
              : "Start Time"}
        </button>
      </div>
      {/* Overview Modal */}
      <Modal
        title="Job Overview"
        isOpen={isOverviewOpen}
        onClose={() => setOverviewOpen(false)}
      >
        <div className="modal-stat">
          Profit: $
          {(job.amount - formattedTotalCost - formattedTotalLaborCost).toFixed(
            2
          )}
        </div>
        <div className="modal-stat">Amount: ${job.amount}</div>
        <div className="modal-stat">
          Total Cost: $
          {(
            parseFloat(formattedTotalCost) + parseFloat(formattedTotalLaborCost)
          ).toFixed(2)}
        </div>
        <div className="modal-stat">Material Cost: ${formattedTotalCost}</div>
        <div className="modal-stat">Labor Cost: ${formattedTotalLaborCost}</div>
      </Modal>

      {/* Description Modal */}
      <Modal
        title="Job Description"
        isOpen={isDescriptionOpen}
        onClose={() => setDescriptionOpen(false)}
      >
        <div className="modal-description">{job.description}</div>
      </Modal>

      {/* Notes Modal */}
      <Modal
        title="Job Notes"
        isOpen={isNotesOpen}
        onClose={() => setNotesOpen(false)}
      >
        <div className="modal-input-container">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter note..."
            className="modal-input"
          />
          <button onClick={addNote} className="modal-button">
            Add
          </button>
        </div>
        <div className="modal-scroll">
          {notes?.map((note) => (
            <div key={note.id} className="modal-note">
              <div>
                {note.note} —{" "}
                <strong>
                  {note.first_name} {note.last_name}
                </strong>
              </div>
              <div className="modal-date">
                {new Date(note.created_at).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Costs Modal */}
      <Modal
        title="Job Costs"
        isOpen={isCostsOpen}
        onClose={() => setCostsOpen(false)}
      >
        <div className="modal-input-container">
          <input
            type="text"
            value={newCostText}
            onChange={(e) => setNewCostText(e.target.value)}
            placeholder="Description"
            className="modal-input"
          />
          <input
            type="number"
            value={newCostAmount}
            onChange={(e) => setNewCostAmount(parseFloat(e.target.value) || 0)}
            placeholder="Amount"
            className="modal-input modal-input-number"
          />
          <button onClick={addCost} className="modal-button">
            Add
          </button>
        </div>

        <div className="modal-scroll">
          {costs?.map((cost) => {
            // Find the user associated with the cost
            const user = orgUsers.find((u) => u.id === cost.user_id);
            return (
              <div key={cost.id} className="modal-cost-entry">
                <div>{cost.description}</div>
                <div>${parseFloat(cost.amount).toFixed(2)}</div>
                <strong>
                  {user
                    ? `${user.first_name} ${user.last_name}`
                    : "Unknown User"}
                </strong>
                <div className="modal-date">
                  {new Date(cost.created_at).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      <Modal
        title="Job Attachments"
        isOpen={isAttachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
      >
        <div className="modal-input-group">
          <input
            type="text"
            value={newAttachHeader}
            onChange={(e) => setNewAttachHeader(e.target.value)}
            placeholder="Figure header"
            className="modal-attachment-input"
          />
          <input
            type="text"
            value={newAttachUrl}
            onChange={(e) => setNewAttachUrl(e.target.value)}
            placeholder="Image URL"
            className="modal-input"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraUpload}
            className="modal-input"
          />
          <button onClick={addAttachment} className="modal-button">
            Add
          </button>
        </div>

        <div className="modal-scroll">
          {attachments?.map((a, idx) => (
            <div key={idx} className="modal-attachment">
              <div className="font-semibold">{a.header}</div>
              <a href={a.url} target="_blank" rel="noreferrer">
                {a.url}
              </a>
              <div className="modal-date">
                {new Date(a.created_at).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export default JobPage;
