import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import Modal from "./Modal.jsx";
import "./JobsListPage.css";

function JobsListPage({ user }) {
  // state for modal
  const [isAddJobOpen, setAddJobOpen] = useState(false);
  const [isEditJobOpen, setEditJobOpen] = useState(false);
  const [jobBeingEdited, setJobBeingEdited] = useState(null);

  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobAmount, setJobAmount] = useState("");
  const [jobDueDate, setJobDueDate] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const queryClient = useQueryClient();

  const fetchJobs = async () => {
    if (!user) return [];

    // Just call api.get(endpoint); token is already read from localStorage in your wrapper
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
    mutationFn: (newJob) => api.post(`/jobs`, newJob),
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
    mutationFn: (newJob) => api.put(`/jobs`, newJob),
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
    queryFn: () => api.get(`/orgusers`),
  });

  if (isLoading) return <div>Loading jobs...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="jobsListPage">
      <h1 className="JobsListPage-header nav-header">
        <NavLink to="/JobsListPage" className="nav-link">
          Job Page
        </NavLink>
        <NavLink
          to="/CrewPage"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Crew Page
        </NavLink>
      </h1>
      {user.is_admin && (
        <button onClick={() => setAddJobOpen(true)}>Add Job</button>
      )}
      {jobsList.length === 0 ? (
        <div>No jobs found</div>
      ) : (
        <nav>
          <ul>
            {jobsList
              .slice() // make a copy so we don’t mutate state
              .sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date) : null;
                const dateB = b.due_date ? new Date(b.due_date) : null;

                // both null → keep original order
                if (!dateA && !dateB) return 0;
                // only A is null → put A after B
                if (!dateA) return 1;
                // only B is null → put B after A
                if (!dateB) return -1;

                // both dates → sort ascending (earliest first)
                return dateA - dateB;
              })
              .map((job) => {
                const formattedDate = job.due_date
                  ? new Date(job.due_date).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "2-digit",
                    })
                  : null;

                return (
                  <NavLink key={job.id} to={`/JobPage/${job.id}`}>
                    <li>
                      <div className="ts">
                        <div>
                          <strong>{job.name}</strong>
                        </div>
                        {/*{job.location || "No location"}{" "}*/}
                        {formattedDate && <em>({formattedDate})</em>}
                        {user.is_admin && (
                          <button
                            className="job-list-edit-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              setJobBeingEdited(job); // <-- Set the job being edited

                              // Prefill modal fields
                              setJobTitle(job.name || "");
                              setJobLocation(job.location || "");
                              setJobDescription(job.description || "");
                              setJobAmount(job.amount || 0);
                              setJobDueDate(
                                job.due_date ? job.due_date.slice(0, 10) : ""
                              );
                              setSelectedUserIds(job.assigned_user_ids || []);

                              setEditJobOpen(true);
                            }}
                          >
                            edit
                          </button>
                        )}
                        {user.is_admin && (
                          <button
                            className="job-list-delete-btn"
                            onClick={(e) => {
                              e.preventDefault();
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
                            delete
                          </button>
                        )}
                      </div>
                    </li>
                  </NavLink>
                );
              })}
          </ul>
        </nav>
      )}
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
            placeholder="Amount"
            className="job-list-modal-input"
          />
          <input
            type="date"
            value={jobDueDate}
            onChange={(e) => setJobDueDate(e.target.value)}
            className="jobs-list-modal-input"
          />
          {/*Map users in org, if clicked on, highlight and assign*/}
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

      {/* edit job Modal */}
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
            className="jobs-list-modal-input"
          />
          {/*Map users in org, if clicked on, highlight and assign*/}
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
