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
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

-- this is where job information will be created/stored
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    attachments TEXT[]
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