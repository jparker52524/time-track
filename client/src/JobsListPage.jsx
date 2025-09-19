import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import Modal from "./Modal.jsx";
import "./JobsListPage.css";

function JobsListPage({ user }) {
    // state for modal
    const [isAddJobOpen, setAddJobOpen] = useState(false);

    const [jobTitle, setJobTitle] = useState("");
    const [jobLocation, setJobLocation] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [jobDueDate, setJobDueDate] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const queryClient = useQueryClient();
    
    const fetchJobs = async () => {
        if (!user) return [];

        // Just call api.get(endpoint); token is already read from localStorage in your wrapper
        const data = await api.get("/userJobsList");
        return data;
    };

    const { data: jobsList = [], isLoading, isError, error } = useQuery({
        queryKey: ["jobs", user?.id],
        queryFn: fetchJobs,
        enabled: !!user,
    });

    const addJobMutation = useMutation({
      mutationFn: (newJob) => api.post(`/jobs`, newJob),
      onSuccess: () => {
        queryClient.invalidateQueries(["jobs", user?.id]);
        setJobTitle("")
        setJobLocation("")
        setJobDescription("")
        setJobDueDate("")
        setAddJobOpen(false)
        setSelectedUserIds([])
      }
     });

    function handleAddJob() {
        addJobMutation.mutate({
            userId: user.id, 
            orgId: user.org_id, 
            jobTitle, 
            jobLocation, 
            jobDescription, 
            jobDueDate,
            assignedUserIds: selectedUserIds,
        });
    }

    const {data: orgUsers = []} = useQuery({
        queryKey: ["orgUsers", user?.id],
        queryFn: () => api.get(`/orgusers`)
    })

    console.log(orgUsers)

    if (isLoading) return <div>Loading jobs...</div>;
    if (isError) return <div>Error: {error.message}</div>;

    return (
    <div className="jobsListPage">
        <h1 className="JobsListPage-header">Jobs List Page</h1>
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
                        </div> {job.location || "No location"}{" "}
                        {formattedDate && <em>({formattedDate})</em>}
                        </div>
                    </li>
                    </NavLink>
                );
                })}
            </ul>
        </nav>
        )}
        <Modal title="Add Job" isOpen={isAddJobOpen} onClose={() => setAddJobOpen(false)}>
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
            <button onClick={handleAddJob} className="jobs-list-modal-button">Add</button>
          </div>
        </Modal>
    </div>
    );
}

export default JobsListPage;