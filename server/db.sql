CREATE DATABASE time_tracker_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LOCALE_PROVIDER = 'libc'
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

CREATE TABLE time_logs (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI generated tables START

-- this is where organizations are created/stored
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- this will be where users are created/stored
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    hourly_rate NUMERIC(10,2) DEFAULT 0
);

-- this is where job information will be created/stored
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    due_date DATE,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE
);

-- this is where job notes will be stored
CREATE TABLE job_notes (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL, -- who wrote it
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- this is where job attachments will be stored
CREATE TABLE job_attachments (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- this is where job costs will be stored
CREATE TABLE job_costs (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- this is where users will be assigned jobs
CREATE TABLE job_assignments (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- this is where the times will be logged (replacing time_Logs)
CREATE TABLE job_times (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ
);

-- AI generated tables END

/* SEED DATA
-- 1. Organizations
INSERT INTO organizations (name) VALUES
('Acme Manufacturing'),
('Beta Robotics');

-- 2. Users (admins + regulars)
-- Passwords here are just placeholders (hashed "password123" using bcrypt for testing)
INSERT INTO users (org_id, first_name, last_name, email, password_hash, is_admin) VALUES
(1, 'Alice', 'Admin', 'alice@acme.com', '$2b$10$S1s7hfTejxvJHEz5xxE2k.2vaVjgYXXvok3iYe6Pi3EIUhpN/UvtS', TRUE),
(1, 'Bob', 'Worker', 'bob@acme.com', '$2b$10$S1s7hfTejxvJHEz5xxE2k.2vaVjgYXXvok3iYe6Pi3EIUhpN/UvtS', FALSE),
(2, 'Charlie', 'Admin', 'charlie@beta.com', '$2b$10$S1s7hfTejxvJHEz5xxE2k.2vaVjgYXXvok3iYe6Pi3EIUhpN/UvtS', TRUE),
(2, 'Dana', 'Worker', 'dana@beta.com', '$2b$10$S1s7hfTejxvJHEz5xxE2k.2vaVjgYXXvok3iYe6Pi3EIUhpN/UvtS', FALSE);

-- 3. Jobs
INSERT INTO jobs (org_id, name, location, notes) VALUES
(1, 'Welding Project', 'Plant 1', 'Weld metal frames'),
(1, 'Assembly Line A', 'Plant 1', 'Assemble components'),
(2, 'Testing Lab Setup', 'HQ', 'Setup robotics testing lab');

-- 4. Job Assignments
INSERT INTO job_assignments (job_id, user_id) VALUES
(1, 1), -- Alice assigned
(1, 2), -- Bob assigned
(2, 2), -- Bob assigned to Assembly Line
(3, 3), -- Charlie assigned
(3, 4); -- Dana assigned

-- 5. Job Times (start/stop logs)
INSERT INTO job_times (job_id, user_id, start_time, end_time) VALUES
(1, 1, '2025-08-29 08:00:00', '2025-08-29 12:00:00'),
(1, 2, '2025-08-29 09:00:00', '2025-08-29 11:30:00'),
(2, 2, '2025-08-28 13:00:00', '2025-08-28 16:00:00'),
(3, 4, '2025-08-29 10:00:00', '2025-08-29 15:00:00');
*/