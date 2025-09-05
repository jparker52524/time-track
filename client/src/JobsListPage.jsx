import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import "./JobsListPage.css";

function JobsListPage({ user }) {
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

    if (isLoading) return <div>Loading jobs...</div>;
    if (isError) return <div>Error: {error.message}</div>;

    return (
        <div>
        <h1 className="JobsListPage-header">Jobs List Page</h1>
        {jobsList.length === 0 ? (
            <div>No jobs found</div>
        ) : (
            <nav>
            <ul>
            {jobsList.map((job) => (
                <NavLink key={job.id} to={`/JobPage/${job.id}`}>
                <li>
                <strong>{job.name}</strong> – {job.location || "No location"}{" "}
                {job.notes && <em>({job.notes})</em>}
                </li>
                </NavLink>
            ))}
            </ul>
            </nav>
        )}
        </div>
    );
    }

export default JobsListPage;