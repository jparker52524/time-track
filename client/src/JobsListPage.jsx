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
    <div className="jobsListPage">
        <h1 className="JobsListPage-header">Jobs List Page</h1>
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
                        <strong>{job.name}</strong> – {job.location || "No location"}{" "}
                        {formattedDate && <em>({formattedDate})</em>}
                    </li>
                    </NavLink>
                );
                })}
            </ul>
        </nav>
        )}
    </div>
    );
}

export default JobsListPage;