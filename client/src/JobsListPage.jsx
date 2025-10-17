import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import { MdEdit, MdDelete } from "react-icons/md";
import Modal from "./Modal.jsx";
import "./JobsListPage.css";

function JobsListPage({ user, setAddJobOpen, isAddJobOpen }) {
  // state for modal
  const [isEditJobOpen, setEditJobOpen] = useState(false);
  const [jobBeingEdited, setJobBeingEdited] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobAmount, setJobAmount] = useState("");
  const [jobDueDate, setJobDueDate] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // New state for filter dropdown
  const [statusFilter, setStatusFilter] = useState("open");

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const fetchJobs = async () => {
    if (!user) return [];
    // token is already handled inside api wrapper
    const data = await api.get("/userJobsList");
    return data;
  };

  const {
    data: jobsList = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: fetchJobs,
    enabled: !!user,
  });

  const addJobMutation = useMutation({
    mutationFn: (newJob) => api.post("/jobs", newJob),
    onSuccess: () => {
      queryClient.invalidateQueries(["jobs", user?.id]);
      setJobTitle("");
      setJobLocation("");
      setJobDescription("");
      setJobAmount("");
      setJobDueDate("");
      setAddJobOpen(false);
      setSelectedUserIds([]);
    },
  });

  function handleAddJob() {
    addJobMutation.mutate({
      userId: user.id,
      orgId: user.org_id,
      jobTitle,
      jobLocation,
      jobDescription,
      jobAmount,
      jobDueDate,
      assignedUserIds: selectedUserIds,
    });
  }

  const editJobMutation = useMutation({
    mutationFn: (newJob) => api.put("/jobs", newJob),
    onSuccess: () => {
      queryClient.invalidateQueries(["jobs", user?.id]);
      setJobTitle("");
      setJobLocation("");
      setJobDescription("");
      setJobAmount("");
      setJobDueDate("");
      setAddJobOpen(false);
      setSelectedUserIds([]);
    },
  });

  function handleEditJob() {
    if (!jobBeingEdited) return;
    editJobMutation.mutate({
      id: jobBeingEdited.id, // pass job ID
      userId: user.id,
      orgId: user.org_id,
      jobTitle,
      jobLocation,
      jobDescription,
      jobAmount,
      jobDueDate,
      assignedUserIds: selectedUserIds,
    });
    // Clear modal state after save
    setEditJobOpen(false);
    setJobBeingEdited(null);
    setJobTitle("");
    setJobLocation("");
    setJobDescription("");
    setJobAmount(null);
    setJobDueDate("");
    setSelectedUserIds([]);
  }

  const deleteJobMutation = useMutation({
    mutationFn: (jobId) => api.delete(`/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["jobs", user?.id]);
    },
    onError: (error) => {
      console.error("Error deleting job:", error);
    },
  });

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["orgUsers", user?.id],
    queryFn: () => api.get("/orgusers"),
  });

  const { data: assignedUsers = [] } = useQuery({
    queryKey: ["assignedUsers", jobBeingEdited?.id],
    queryFn: () => {
      if (!jobBeingEdited?.id) return Promise.resolve([]);
      return api.get(`/jobs/${jobBeingEdited.id}/assigned-users`);
    },
  });

  useEffect(() => {
    if (assignedUsers && Array.isArray(assignedUsers.assignedUserIds)) {
      setSelectedUserIds(assignedUsers.assignedUserIds);
    } else {
      setSelectedUserIds([]);
    }
  }, [assignedUsers]);

  useEffect(() => {
    if (isAddJobOpen && !jobDueDate) {
      const today = new Date();
      const formattedToday = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
      setJobDueDate(formattedToday);
    }
  }, [isAddJobOpen, jobDueDate]);

  if (isLoading) return <div className="centered-message">Loading jobs...</div>;
  if (isError)
    return <div className="centered-message">Error: {error.message}</div>;

  // Filter jobs based on statusFilter state
  const filteredJobs = jobsList.filter((job) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return !job.is_closed;
    if (statusFilter === "closed") return job.is_closed;
    return true;
  });

  return (
    <div>
      <h1 className="JobsListPage-header nav-header">
        <NavLink to="/JobsListPage" className="nav-link">
          Jobs
        </NavLink>
        {user.is_admin && (
          <NavLink
            to="/CrewPage"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Crew
          </NavLink>
        )}
      </h1>

      {/* Filter dropdown above the table */}
      {user.is_admin && (
        <div className="status-filter-container">
          <label className="status-filter-label" htmlFor="status-filter">
            Show:
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter-select"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <div>No jobs found</div>
      ) : (
        <table className="crew-table">
          <thead>
            <tr>
              <th>Title</th>
              {/* <th>Location</th> */}
              <th>Due</th>
              {user.is_admin && <th>Status</th>}
              {user.is_admin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredJobs
              .slice()
              .sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date) : null;
                const dateB = b.due_date ? new Date(b.due_date) : null;
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA - dateB;
              })
              .map((job) => {
                const formattedDate = job.due_date
                  ? new Date(job.due_date).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "2-digit",
                    })
                  : "";
                return (
                  <tr
                    key={job.id}
                    className="clickable-row"
                    onClick={() => navigate(`/JobPage/${job.id}`)}
                  >
                    <td>{job.name}</td>
                    {/* <td>{job.location || "—"}</td> */}
                    <td>{formattedDate || "—"}</td>
                    {user.is_admin && (
                      <td>{job.is_closed ? "Closed" : "Open"}</td>
                    )}
                    {user.is_admin && (
                      <td>
                        <div className="action-icons">
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setJobBeingEdited(job);
                              setJobTitle(job.name || "");
                              setJobLocation(job.location || "");
                              setJobDescription(job.description || "");
                              setJobAmount(job.amount || 0);
                              setJobDueDate(
                                job.due_date ? job.due_date.slice(0, 10) : ""
                              );
                              setEditJobOpen(true);
                            }}
                          >
                            <MdEdit size={20} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this job?"
                                )
                              ) {
                                deleteJobMutation.mutate(job.id);
                              }
                            }}
                          >
                            <MdDelete size={20} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}

      {/* Add Job Modal */}
      <Modal
        title="Add Job"
        isOpen={isAddJobOpen}
        onClose={() => setAddJobOpen(false)}
      >
        <div className="jobs-list-modal-input-container">
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Enter Title..."
            className="jobs-list-modal-input"
          />
          <input
            type="text"
            value={jobLocation}
            onChange={(e) => setJobLocation(e.target.value)}
            placeholder="Enter Location..."
            className="jobs-list-modal-input"
          />
          <input
            type="text"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter Description..."
            className="jobs-list-modal-input"
          />
          <input
            type="number"
            value={jobAmount}
            onChange={(e) => setJobAmount(e.target.value)}
            placeholder="Enter Amount..."
            className="job-list-modal-input"
          />
          <input
            type="date"
            value={jobDueDate}
            onChange={(e) => setJobDueDate(e.target.value)}
            className="date-input"
          />
          {/* Map users in org, if clicked on, highlight and assign */}
          <div className="user-selection-list">
            {orgUsers.map((orgUser) => {
              const isSelected = selectedUserIds.includes(orgUser.id);
              return (
                <div
                  key={orgUser.id}
                  className={`user-item ${isSelected ? "user-item--selected" : ""}`}
                  onClick={() => {
                    setSelectedUserIds((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== orgUser.id)
                        : [...prev, orgUser.id]
                    );
                  }}
                >
                  {orgUser.first_name} {orgUser.last_name}
                </div>
              );
            })}
          </div>
          <button onClick={handleAddJob} className="jobs-list-modal-button">
            Add
          </button>
        </div>
      </Modal>

      {/* Edit Job Modal */}
      <Modal
        title="Edit Job"
        isOpen={isEditJobOpen}
        onClose={() => {
          setEditJobOpen(false);
          setJobBeingEdited(null);
          setJobTitle("");
          setJobLocation("");
          setJobDescription("");
          setJobAmount("");
          setJobDueDate("");
          setSelectedUserIds([]);
        }}
      >
        <div className="jobs-list-modal-input-container">
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Enter Title..."
            className="jobs-list-modal-input"
          />
          <input
            type="text"
            value={jobLocation}
            onChange={(e) => setJobLocation(e.target.value)}
            placeholder="Enter Location..."
            className="jobs-list-modal-input"
          />
          <input
            type="text"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter Description..."
            className="jobs-list-modal-input"
          />
          <input
            type="number"
            value={jobAmount}
            onChange={(e) => setJobAmount(e.target.value)}
            placeholder="Amount"
            className="job-list-modal-input"
          />
          <input
            type="date"
            value={jobDueDate}
            onChange={(e) => setJobDueDate(e.target.value)}
            className="date-input"
          />
          {/* Map users in org, if clicked on, highlight and assign */}
          <div className="user-selection-list">
            {orgUsers.map((orgUser) => {
              const isSelected = selectedUserIds.includes(orgUser.id);
              return (
                <div
                  key={orgUser.id}
                  className={`user-item ${isSelected ? "user-item--selected" : ""}`}
                  onClick={() => {
                    setSelectedUserIds((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== orgUser.id)
                        : [...prev, orgUser.id]
                    );
                  }}
                >
                  {orgUser.first_name} {orgUser.last_name}
                </div>
              );
            })}
          </div>
          <button onClick={handleEditJob} className="jobs-list-modal-button">
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default JobsListPage;
