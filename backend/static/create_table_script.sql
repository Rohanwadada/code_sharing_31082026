CREATE TABLE user_details (
    user_id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_name VARCHAR(100) NULL,
    user_email TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    profile_image TEXT NULL,
    registration_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    institute_or_organization VARCHAR(200) NULL,
    provided_role VARCHAR(100) NULL DEFAULT 'Learner',
    utm_source VARCHAR(100) NULL,
    phone_no TEXT UNIQUE NULL,
    linkedin_profile VARCHAR(255) NULL,
    designation_specialization VARCHAR(150) NULL,
    year_of_experience FLOAT NULL,
    gender TEXT NULL
);

CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    current_refresh_jti TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_user_sessions_status
        CHECK (status IN ('active', 'revoked'))
);


CREATE TABLE organizations (
    organization_id UUID PRIMARY KEY,

    organization_name TEXT NOT NULL,
    -- slug TEXT NOT NULL,

    organization_details JSONB DEFAULT '{}',

    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_organizations_user
        FOREIGN KEY (created_by)
        REFERENCES user_details(user_id),
        
    CONSTRAINT fk_organizations_user_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES user_details(user_id)

    -- CONSTRAINT uq_organizations_slug
    --     UNIQUE (slug)
);


CREATE TABLE teams (
    team_id TEXT PRIMARY KEY,

    organization_id UUID NOT NULL,
    created_by UUID NOT NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    team_metadata JSONB DEFAULT '{}',


    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_teams_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_teams_created_by
        FOREIGN KEY (created_by)
        REFERENCES user_details(user_id),

    CONSTRAINT uq_teams_slug
        UNIQUE (slug)
);


CREATE TABLE organization_memberships (
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,

    status TEXT NOT NULL,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY(user_id, organization_id),

    CONSTRAINT fk_organization_memberships_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_organization_memberships_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE
);

CREATE TABLE team_memberships (
    user_id UUID NOT NULL,
    team_id TEXT NOT NULL,

    status TEXT NOT NULL,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY(user_id, team_id),

    CONSTRAINT fk_team_memberships_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_team_memberships_team
        FOREIGN KEY (team_id)
        REFERENCES teams(team_id)
        ON DELETE CASCADE
);


CREATE TABLE projects
(
    project_id UUID NOT NULL DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    organization_id UUID NOT NULL,
    hiring_goal TEXT,
    jd_url TEXT,
    project_status JSONB NOT NULL DEFAULT '{"status": "draft"}'::JSONB,
    created_by UUID,
    project_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    function_id UUID,
    designation_id UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT projects_pkey PRIMARY KEY (project_id)
);


CREATE TABLE project_hiring_managers
(
    project_manager_id UUID NOT NULL DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT project_hiring_managers_pkey PRIMARY KEY (project_manager_id),
    CONSTRAINT project_hiring_managers_project_id_fkey FOREIGN KEY (project_id)
        REFERENCES public.projects (project_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);


CREATE TABLE project_hiring_sponsors
(
    project_hiring_sponsor_id UUID NOT NULL DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_by UUID,
    sponsor_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT project_hiring_sponsors_pkey PRIMARY KEY (project_hiring_sponsor_id),
    CONSTRAINT project_hiring_sponsors_project_id_fkey FOREIGN KEY (project_id)
        REFERENCES public.projects (project_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);


CREATE TABLE roadmaps (
    roadmap_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    team_id TEXT NULL,
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    roadmap_graph JSONB NOT NULL,
    roadmap_content JSONB NOT NULL,
    price JSONB NOT NULL DEFAULT '[]'::JSONB,
    level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    status TEXT NOT NULL CHECK (status IN ('published', 'pending', 'draft')),
    visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('public', 'org', 'team', 'private')),
    roadmap_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_roadmaps_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_roadmaps_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_roadmaps_team
        FOREIGN KEY (team_id)
        REFERENCES teams(team_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_roadmaps_project
        FOREIGN KEY (project_id)
        REFERENCES projects(project_id)
        ON DELETE CASCADE
);

-- create trigger to update search verctor
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(
            (SELECT string_agg(node->'data'->>'label', ' ') 
             FROM jsonb_array_elements(NEW.roadmap_graph->'nodes') AS node),
            ''
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE ON roadmaps
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();

CREATE TABLE user_roadmap (
    user_id UUID NOT NULL,
    granted_by UUID,
    roadmap_id VARCHAR NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('owner', 'viewer', 'editor')),
    sharing_mode VARCHAR NOT NULL CHECK (sharing_mode IN ('basic_sharing', 'purchase', 'public_sharing', 'owner_sharing', 'access_shared_by_admin', 'collaboration')),
    user_roadmap_data JSONB NOT NULL,
    status VARCHAR CHECK(status IN ('active', 'blocked')) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, roadmap_id),

    CONSTRAINT fk_user_roadmap_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_user_roadmap_granted_by
        FOREIGN KEY (granted_by)
        REFERENCES user_details(user_id)
        ON DELETE SET NULL,
        
    CONSTRAINT fk_user_roadmap_roadmap
        FOREIGN KEY (roadmap_id)
        REFERENCES roadmaps(roadmap_id)
        ON DELETE CASCADE
);


CREATE TABLE roadmap_user_data (
    id SERIAL PRIMARY KEY, 
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    team_id TEXT NULL,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_roadmap_user_data_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_roadmap_user_data_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_roadmap_user_data_team
        FOREIGN KEY (team_id)
        REFERENCES teams(team_id)
        ON DELETE CASCADE
);


-- CREATE TABLE roadmap_progress (
--     user_id UUID NOT NULL,
--     roadmap_id TEXT NOT NULL,
--     progress_data JSONB NOT NULL DEFAULT '{}'::JSONB,
--     completed_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completed_percentage BETWEEN 0 AND 100),
--     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     PRIMARY KEY(user_id, roadmap_id),

--     CONSTRAINT fk_roadmap_progress_user
--         FOREIGN KEY (user_id)
--         REFERENCES user_details(user_id)
--         ON DELETE CASCADE,
        
--     CONSTRAINT fk_roadmap_progress_roadmap
--         FOREIGN KEY (roadmap_id)
--         REFERENCES roadmaps(roadmap_id)
--         ON DELETE CASCADE
-- );

-- CREATE TABLE permissions (
--     permission_key VARCHAR(100) PRIMARY KEY,
--     module VARCHAR(100) NOT NULL,
--     description TEXT NULL,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE features (
--     feature_id TEXT PRIMARY KEY,
--     parent_id TEXT,

--     feature_key TEXT UNIQUE NOT NULL,
--     feature_name TEXT NOT NULL,
--     category TEXT NOT NULL,
--     description TEXT NOT NULL,
--     display_order INT DEFAULT 0,
--     is_active BOOLEAN DEFAULT TRUE,
--     feature_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    
--     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT fk_features_parent
--         FOREIGN KEY (parent_id)
--         REFERENCES features(feature_id)
-- );


-- CREATE TABLE roles (
--     role_id TEXT PRIMARY KEY,
--     organization_id TEXT NULL,
--     name TEXT NOT NULL,
--     scope TEXT NOT NULL CHECK(scope IN ('platform', 'org','team')),
--     created_by UUID NOT NULL,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT fk_roles_organization
--         FOREIGN KEY (organization_id)
--         REFERENCES organizations(organization_id)
--         ON DELETE CASCADE,
        
--     CONSTRAINT fk_roles_created_by
--         FOREIGN KEY (created_by)
--         REFERENCES user_details(user_id)
-- );


-- CREATE TABLE role_feature_permissions (
--     role_id TEXT NOT NULL,
--     feature_id VARCHAR(100) NOT NULL,
--     sub_features JSONB NOT NULL DEFAULT '[]'::JSONB,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     PRIMARY KEY(role_id, feature_id),

--     CONSTRAINT fk_role_feature_permissions_role
--         FOREIGN KEY (role_id)
--         REFERENCES roles(role_id)
--         ON DELETE CASCADE,
        
--     CONSTRAINT fk_role_feature_permissions_feature
--         FOREIGN KEY (feature_id)
--         REFERENCES features(feature_id)
--         ON DELETE CASCADE
-- );


-- CREATE TABLE user_role_assignments (
--     assignment_id TEXT PRIMARY KEY,
--     user_id UUID NOT NULL,
--     role_id TEXT NOT NULL,
--     organization_id TEXT NULL,
--     team_id TEXT NULL,

--     UNIQUE NULLS NOT DISTINCT (
--         user_id,
--         role_id,
--         organization_id,
--         team_id
--     ),
    
--     CONSTRAINT fk_user_role_assignments_user
--         FOREIGN KEY (user_id)
--         REFERENCES user_details(user_id)
--         ON DELETE CASCADE,
        
--     CONSTRAINT fk_user_role_assignments_role
--         FOREIGN KEY (role_id)
--         REFERENCES roles(role_id)
--         ON DELETE CASCADE,
        
--     CONSTRAINT fk_user_role_assignments_organization
--         FOREIGN KEY (organization_id)
--         REFERENCES organizations(organization_id)
--         ON DELETE CASCADE,
        
--     CONSTRAINT fk_user_role_assignments_team_id
--         FOREIGN KEY (team_id)
--         REFERENCES teams(team_id)
--         ON DELETE CASCADE
-- );

CREATE TABLE chat_threads (
    thread_id TEXT PRIMARY KEY NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    team_id TEXT NULL,
    project_id UUID NOT NULL,

    title TEXT,
    thread_type TEXT NOT NULL,
    thread_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_threads_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_chat_threads_team
        FOREIGN KEY (team_id)
        REFERENCES teams(team_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chat_threads_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_chat_threads_project
        FOREIGN KEY (project_id)
        REFERENCES projects(project_id)
        ON DELETE CASCADE
);

CREATE TABLE conversation_messages (
    message_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    

    role TEXT NOT NULL CHECK (role IN ('human', 'assistant')),
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    message_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
    CONSTRAINT fk_conversation_messages_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE
);

-- Fast history loading
CREATE INDEX idx_conv_thread_created
ON conversation_messages (thread_id, created_at);

-- Fast streaming updates
CREATE INDEX idx_conv_thread_updated
ON conversation_messages (thread_id, updated_at);


CREATE TABLE artifact_repository (
    artifact_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    team_id TEXT NULL,
    project_id UUID NOT NULL,
    
    title TEXT,
    description TEXT,

    artifact_data JSONB DEFAULT '{}'::jsonb,
    artifact_type TEXT,

    artifact_metadata JSONB DEFAULT '{}'::jsonb,
	
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_artifact_repository_thread
        FOREIGN KEY (thread_id)
        REFERENCES chat_threads(thread_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_artifact_repository_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_artifact_repository_team
        FOREIGN KEY (team_id)
        REFERENCES teams(team_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_artifact_repository_project
        FOREIGN KEY (project_id)
        REFERENCES projects(project_id)
        ON DELETE CASCADE
);

CREATE TABLE background_jobs (
    id SERIAL PRIMARY KEY,
    job_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    team_id TEXT NULL,
    job_type VARCHAR(255) NOT NULL,
    job_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (job_id, organization_id),
    
    CONSTRAINT fk_background_jobs_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_background_jobs_team
        FOREIGN KEY (team_id)
        REFERENCES teams(team_id)
        ON DELETE CASCADE
);

CREATE TABLE background_task_notification_preference (
    id SERIAL PRIMARY KEY,

    user_id UUID NOT NULL,
    job_id TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    status TEXT NOT NULL,

    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE
);

CREATE TABLE ey_courses (
    id SERIAL PRIMARY KEY,
    course_id TEXT,
    course_name TEXT,
    course_url TEXT,
    course_modules JSONB,
    course_description TEXT,
    course_metadata JSONB
);

CREATE TABLE opensource_content_sources (
    content_source_id TEXT PRIMARY KEY,

    created_by UUID NOT NULL,
    
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    topic TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_opensource_content_sources_created_by
        FOREIGN KEY (created_by)
        REFERENCES user_details(user_id)
        ON DELETE CASCADE
);

CREATE TABLE functions
(
    function_id UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    function_name TEXT  NOT NULL,
    function_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT functions_pkey PRIMARY KEY (function_id)
);


CREATE TABLE designations
(
    designation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    function_id UUID,
    organization_id UUID NOT NULL,
    designation_name TEXT  NOT NULL,
    created_by TEXT,
    designation_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT designations_pkey PRIMARY KEY (designation_id),
    CONSTRAINT designations_function_id_fkey FOREIGN KEY (function_id)
        REFERENCES functions (function_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);


CREATE TABLE competencies
(
    competency_id UUID NOT NULL DEFAULT gen_random_uuid(),
    competency_name CHARACTER VARYING(255) NOT NULL,
    competency_description text,
    source_of_competency CHARACTER VARYING(255),
    organization_id UUID,
    created_by TEXT,
    competency_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    updated_by TEXT,
    designation_id UUID,
    function_id UUID,
    
    CONSTRAINT competencies_pkey PRIMARY KEY (competency_id),
    CONSTRAINT fk_comp_designation FOREIGN KEY (designation_id)
        REFERENCES designations (designation_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT fk_comp_function FOREIGN KEY (function_id)
        REFERENCES functions (function_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);


CREATE TABLE IF NOT EXISTS subcompetencies
(
    subcompetency_id UUID NOT NULL DEFAULT gen_random_uuid(),
    competency_id UUID NOT NULL,
    subcompetency_name CHARACTER VARYING(255) NOT NULL,
    subcompetency_description text,
    source_of_subcompetency CHARACTER VARYING(255),
    organization_id UUID,
    created_by TEXT,
    updated_by TEXT,
    subcompetency_details jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    designation_id UUID,
    function_id UUID,
    
    CONSTRAINT subcompetencies_pkey PRIMARY KEY (subcompetency_id),
    CONSTRAINT fk_subcomp_designation FOREIGN KEY (designation_id)
        REFERENCES designations (designation_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT fk_subcomp_function FOREIGN KEY (function_id)
        REFERENCES functions (function_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT subcompetencies_competency_id_fkey FOREIGN KEY (competency_id)
        REFERENCES competencies (competency_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);


CREATE TABLE mcq_questions
(
    mcq_question_id UUID NOT NULL DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    option_1 TEXT,
    option_2 TEXT,
    option_3 TEXT,
    option_4 TEXT,
    correct_option_text TEXT,
    competency_id UUID,
    subcompetency_id UUID,
    question_type TEXT DEFAULT 'mcq',
    hints_text TEXT,
    code_snippets TEXT,
    marks integer,
    source_of_question CHARACTER VARYING(255),
    organization_id UUID,
    question_status CHARACTER VARYING(50),
    question_details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT,
    updated_by TEXT,
    designation_id UUID,
    function_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT mcq_questions_pkey PRIMARY KEY (mcq_question_id)
);


CREATE TABLE assessment_formation
(
    assessment_formation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    assessment_formation_name CHARACTER VARYING(255),
    assessment_duration integer,
    organization_id UUID,
    curate_flow_node_id UUID,
    assessment_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by TEXT,
    updated_by TEXT,
    designation_id UUID,
    function_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT assessment_formation_pkey PRIMARY KEY (assessment_formation_id)
);


CREATE TABLE project_assessment_map
(
    project_assessment_map_id UUID NOT NULL DEFAULT gen_random_uuid(),
    project_id UUID,
    assessment_formation_id UUID,
    created_by UUID,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT project_assessment_map_pkey PRIMARY KEY (project_assessment_map_id)
);

CREATE TABLE roadmap_learning_assessment (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    roadmap_id TEXT,
    node_id TEXT,
    organization_id UUID,
    created_by UUID,
    updated_by UUID,

    duration INTEGER NOT NULL DEFAULT 0,

    assessment_url TEXT,
    excel_export_url TEXT,

    assessment_details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assessment_roadmap
        FOREIGN KEY (roadmap_id)
        REFERENCES roadmaps (roadmap_id),
        
    CONSTRAINT fk_assessment_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (organization_id),

    CONSTRAINT fk_assessment_created_by
        FOREIGN KEY (created_by)
        REFERENCES user_details (user_id),

    CONSTRAINT fk_assessment_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES user_details (user_id)
);


CREATE TABLE roadmap_learning_assessment_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    assessment_id UUID NOT NULL,

    question_text TEXT NOT NULL,

    option_1 TEXT,
    option_2 TEXT,
    option_3 TEXT,
    option_4 TEXT,

    question_type TEXT DEFAULT 'mcq',

    correct_option_text TEXT,
    hints_text TEXT,
    code_snippets TEXT,

    topic TEXT,
    subtopic TEXT,

    solution_explanation TEXT,

    marks INTEGER,

    source_of_question VARCHAR(255),
    question_status VARCHAR(50),

    question_details JSONB DEFAULT '{}'::jsonb,

    organization_id UUID,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_question_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES roadmap_learning_assessment (assessment_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_question_created_by
        FOREIGN KEY (created_by)
        REFERENCES user_details (user_id),

    CONSTRAINT fk_question_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES user_details (user_id)
);

CREATE TABLE IF NOT EXISTS public.user_assessment_access (
    access_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    assessment_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    organization_id UUID,
    access_status TEXT DEFAULT 'GRANTED'::TEXT NOT NULL,
    granted_by TEXT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    access_details JSONB DEFAULT '{}'::JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_access_assessment_id ON public.user_assessment_access (assessment_id);
CREATE INDEX IF NOT EXISTS idx_user_access_user_email ON public.user_assessment_access (LOWER(user_email));

CREATE TABLE allocated_exams (
    allocation_id TEXT PRIMARY KEY,

    user_id UUID NOT NULL,
    exam_id UUID NOT NULL,

    allocated_questions JSONB NOT NULL,
    total_questions INTEGER NOT NULL,
    complexity_distribution JSONB NOT NULL,

    exam_duration INTEGER NOT NULL,

    allocated_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    test_language TEXT NOT NULL DEFAULT 'en-US',

    assessment_type TEXT NOT NULL,

    CONSTRAINT fk_allocated_exams_user
        FOREIGN KEY (user_id)
        REFERENCES user_details(user_id)
);

CREATE TABLE submissions (
    submission_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

    allocation_id TEXT NOT NULL,

    submission_details JSONB NOT NULL,

    total_marks DOUBLE PRECISION NOT NULL,
    obtained_marks DOUBLE PRECISION NOT NULL,
    obtained_percentage DOUBLE PRECISION NOT NULL,

    secured_level TEXT NOT NULL,

    submission_mode TEXT NOT NULL,

    submission_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    total_time_taken TEXT NOT NULL,
    average_time_taken TEXT NOT NULL,

    number_of_attempted_question INTEGER NOT NULL,

    total_number_of_correct_answer INTEGER NOT NULL DEFAULT 0,
    total_number_of_partial_correct_answer INTEGER NOT NULL DEFAULT 0,

    best_streak INTEGER NOT NULL DEFAULT 0,

    detailed_result JSONB NOT NULL,

    evaluation_details JSONB DEFAULT '{}'::jsonb,

    final_result JSONB DEFAULT '{}'::jsonb,

    is_final_submission BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_submissions_allocation
        FOREIGN KEY (allocation_id)
        REFERENCES allocated_exams(allocation_id)
);


-- ALTER TABLE artifact_repository
-- ADD COLUMN project_id UUID,
-- ADD CONSTRAINT fk_artifact_repository_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(project_id);