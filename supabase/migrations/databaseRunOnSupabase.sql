-- ================================================================================================
-- Part 1: Table Creation
-- This section creates all the necessary tables for your application.
-- ================================================================================================

-- Table for user diary entries
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  mood_score integer CHECK (mood_score >= 1 AND mood_score <= 10),
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.diary_entries IS 'Stores individual diary entries for each user.';

-- Table for community discussion posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT true,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.community_posts IS 'Stores posts made by users in the community section.';

-- Table for responses to community posts
CREATE TABLE IF NOT EXISTS public.community_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.community_responses IS 'Stores replies to posts in the community section.';

-- Table for user profile information
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  age_range text CHECK (age_range IN ('13-15', '16-18', '19-24')),
  preferred_activities text[] DEFAULT '{}',
  wellness_goals text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.user_profiles IS 'Stores additional non-auth information for users.';

-- **NEW**: Table for storing image metadata linked to diary entries
CREATE TABLE IF NOT EXISTS public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  diary_entry_id uuid REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  context text,
  mood text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.memories IS 'Stores user-generated memories linked to diary entries and images.';


-- ================================================================================================
-- Part 2: Row Level Security (RLS)
-- This section enables RLS and creates policies to protect your data.
-- Users will only be able to access and manage their own records.
-- ================================================================================================

-- Enable RLS for all tables
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Policies for diary_entries
CREATE POLICY "Users can manage their own diary entries" ON public.diary_entries
  FOR ALL USING (auth.uid() = user_id);

-- Policies for community_posts
CREATE POLICY "Allow authenticated read access to all posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own posts" ON public.community_posts
  FOR ALL USING (auth.uid() = user_id);

-- Policies for community_responses
CREATE POLICY "Allow authenticated read access to all responses" ON public.community_responses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own responses" ON public.community_responses
  FOR ALL USING (auth.uid() = user_id);

-- Policies for user_profiles
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- Policies for memories
CREATE POLICY "Users can manage their own memories" ON public.memories
  FOR ALL USING (auth.uid() = user_id);


-- ================================================================================================
-- Part 3: Storage Bucket and Policies
-- This section creates the storage bucket for images and sets its security rules.
-- ================================================================================================

-- Create a public bucket for diary images.
-- 'public: true' allows file access via URL, but RLS policies below will secure uploads/deletes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary_images', 'diary_images', true)
ON CONFLICT (id) DO NOTHING; -- Prevents error if script is run again.

-- Policies for the 'diary_images' storage bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diary_images');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'diary_images');

CREATE POLICY "Allow individual user updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'diary_images');

CREATE POLICY "Allow individual user deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);

--
-- T_ABLE: posts
-- DESCRIPTION: Stores the main posts or stories shared by users in the community.
--
CREATE TABLE public.posts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NULL DEFAULT auth.uid(), -- The user who created the post (can be null for anonymous)
    author_name text NULL, -- A display name, can be anonymous
    content text NOT NULL, -- The main body of the post
    tags text[] NULL, -- An array of tags for categorization
    CONSTRAINT posts_pkey PRIMARY KEY (id),
    CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Add comments to the posts table to enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;


--
-- TABLE: comments
-- DESCRIPTION: Stores responses or comments related to a specific post.
--
CREATE TABLE public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NULL DEFAULT auth.uid(), -- The user who wrote the comment (can be null for anonymous)
    author_name text NULL, -- Display name for the commenter
    content text NOT NULL, -- The text of the comment
    post_id uuid NOT NULL, -- Foreign key linking to the 'posts' table
    CONSTRAINT comments_pkey PRIMARY KEY (id),
    CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts (id) ON DELETE CASCADE,
    CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Add comments to the comments table to enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;


--
-- RLS POLICIES FOR 'posts' TABLE
--

-- POLICY: Allow anyone to read all posts.
-- The community is public, so all users (authenticated or not) should be able to view posts.
CREATE POLICY "Allow public read access to posts"
ON public.posts
FOR SELECT
USING (true);

-- POLICY: Allow authenticated users to create posts.
-- Users who are logged in can share their own stories.
CREATE POLICY "Allow authenticated users to insert posts"
ON public.posts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- POLICY: Allow users to update their own posts.
-- Users should only be able to edit the posts they have created.
CREATE POLICY "Allow users to update their own posts"
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id);

-- POLICY: Allow users to delete their own posts.
-- Users should have control to remove the content they have shared.
CREATE POLICY "Allow users to delete their own posts"
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);


--
-- RLS POLICIES FOR 'comments' TABLE
--

-- POLICY: Allow anyone to read all comments.
-- All responses should be publicly visible to foster community discussion.
CREATE POLICY "Allow public read access to comments"
ON public.comments
FOR SELECT
USING (true);

-- POLICY: Allow authenticated users to create comments.
-- Logged-in users can respond to posts.
CREATE POLICY "Allow authenticated users to insert comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- POLICY: Allow users to update their own comments.
-- Users can edit their own responses.
CREATE POLICY "Allow users to update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id);

-- POLICY: Allow users to delete their own comments.
-- Users can delete the comments they have made.
CREATE POLICY "Allow users to delete their own comments"
ON public.comments
FOR DELETE
USING (auth.uid() = user_id);

-- Drop old tables to ensure a clean slate
DROP TABLE IF EXISTS public.comments;
DROP TABLE IF EXISTS public.posts;

-- TABLE: posts
CREATE TABLE public.posts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NULL DEFAULT auth.uid(), -- Links post to the logged-in user (can be null if you want to allow non-logged-in posts)
    author_name text NULL,
    content text NOT NULL,
    tags text[] NULL,
    comment_count integer NOT NULL DEFAULT 0,
    ai_analysis jsonb NULL, -- To store the AI's analysis of the post content
    CONSTRAINT posts_pkey PRIMARY KEY (id),
    CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- TABLE: comments
CREATE TABLE public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL DEFAULT auth.uid(), -- User who wrote the comment
    author_name text NULL,
    content text NOT NULL,
    post_id uuid NOT NULL,
    parent_comment_id uuid NULL, -- This is the key for threaded replies
    ai_analysis jsonb NULL, -- To store the AI's analysis of the comment
    CONSTRAINT comments_pkey PRIMARY KEY (id),
    CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts (id) ON DELETE CASCADE,
    CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments (id) ON DELETE CASCADE
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Allow public read access" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow insert for authenticated users" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow users to update their own content" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own content" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- File: supabase_schema_and_policies.sql
-- Description: Creates the user_ai_summaries table and its security policies.
-- Instructions: Run this entire script in your Supabase SQL Editor.

-- 1. CREATE THE TABLE
-- This table will store a continuously updated AI-generated summary for each user.
CREATE TABLE public.user_ai_summaries (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    diary_summary TEXT,
    aichat_summary TEXT, -- Placeholder for your future chat feature
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a comment to describe the table's purpose
COMMENT ON TABLE public.user_ai_summaries IS 'Stores evolving AI-generated summaries of user activities for personalized recommendations.';

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- This is a critical security step. It ensures that by default, no one can access the data in this table.
-- We will add specific policies below to grant access.
ALTER TABLE public.user_ai_summaries ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES
-- Policies define the rules for who can access or modify rows in the table.

-- POLICY 1: Allow users to read their OWN summary.
-- This lets the Home page fetch the summary to generate recommendations.
CREATE POLICY "Allow individual user read access"
ON public.user_ai_summaries
FOR SELECT
USING (auth.uid() = user_id);

-- POLICY 2: Allow users to create their OWN initial summary.
-- This is needed for the `upsert` operation when a user saves their very first entry.
CREATE POLICY "Allow individual user insert access"
ON public.user_ai_summaries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- POLICY 3: Allow users to update their OWN summary.
-- This is also needed for the `upsert` operation on subsequent saves.
-- NOTE: In our final design, updates are handled by a secure Edge Function, but this policy is good practice.
CREATE POLICY "Allow individual user update access"
ON public.user_ai_summaries
FOR UPDATE
USING (auth.uid() = user_id);

-- A note on security:
-- The logic for *updating* the summary (calling the Gemini AI) should be in a Supabase Edge Function
-- using the `service_role` key. This prevents users from manipulating their own summaries directly
-- from the client-side and protects your AI API key. The policies above ensure that even if they tried,
-- they could only ever read or write to their own row.

ALTER TABLE public.user_ai_summaries
ADD COLUMN recommendations JSONB;

-- Create a table to store individual chat messages
CREATE TABLE public.chat_messages (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL
);

-- Add comments for clarity
COMMENT ON TABLE public.chat_messages IS 'Stores the conversation history for the AI chat feature.';
COMMENT ON COLUMN public.chat_messages.role IS 'The role of the message sender, either "user" or "model" (for the AI).';
COMMENT ON COLUMN public.chat_messages.content IS 'The text content of the message.';

-- Create an index on user_id and created_at for fast retrieval of chat histories
CREATE INDEX idx_chat_messages_user_id_created_at ON public.chat_messages(user_id, created_at DESC);

-- 1. Enable Row Level Security on the new table
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that allows users to INSERT their own messages
CREATE POLICY "Users can insert their own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Create a policy that allows users to SELECT (read) their own messages
CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- NOTE: We are intentionally NOT creating policies for UPDATE or DELETE.
-- This makes the chat history immutable from the client-side for simplicity and integrity.

-- Add avatar column with a default value
ALTER TABLE public.user_profiles
ADD COLUMN avatar TEXT NOT NULL DEFAULT 'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958403/memo_35_ixu6ha.png';

-- Optional: Backfill existing rows with the default avatar if they’re NULL
UPDATE user_profiles
SET avatar = 'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958403/memo_35_ixu6ha.png'
WHERE avatar IS NULL;

INSERT INTO public.user_profiles (
  id,
  display_name,
  age_range,
  preferred_activities,
  wellness_goals
) VALUES (
  '191c5cd1-4cc7-45ce-b67e-a07a040428ff',  -- user id
  'Akshay',                                -- display_name
  '19-24',                                 -- age_range (must match one of the allowed values)
  ARRAY['running', 'meditation'],          -- preferred_activities
  ARRAY['fitness', 'stress reduction']     -- wellness_goals
);

-- -- Add columns for username, gender and dob to user_profiles
-- ALTER TABLE public.user_profiles
--   ADD COLUMN IF NOT EXISTS username text UNIQUE,
--   ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male','female','non-binary','prefer_not_say')) DEFAULT 'prefer_not_say',
--   ADD COLUMN IF NOT EXISTS dob date;

-- -- (Optional) If you want an index for username lookups:
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (username);

ALTER TABLE public.user_profiles
ADD COLUMN favorite_color TEXT NULL;

-- -- ====================================================================
-- --  1. TABLE SCHEMA for daily_motivation
-- -- ====================================================================
-- -- This command creates the table with the specified columns.
-- -- - 'id' is a unique identifier for each record.
-- -- - 'created_at' automatically records the time of creation,
-- --   which is essential for fetching the most recent entry.

-- -- drop table if exists public.daily_motivation;

-- CREATE TABLE public.daily_motivation (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   created_at timestamp with time zone NOT NULL DEFAULT now(),
--   name text NOT NULL,
--   quote text NOT NULL,
--   audioLink text NOT NULL,
--   imageLink text NOT NULL,
--   CONSTRAINT daily_motivation_pkey PRIMARY KEY (id)
-- );

-- -- Add a comment to the table for clarity in your database schema.
-- COMMENT ON TABLE public.daily_motivation IS 'Stores the daily motivational quote, audio, and author.';


-- -- ====================================================================
-- --  2. ROW LEVEL SECURITY (RLS) POLICIES
-- -- ====================================================================
-- -- First, we must enable Row Level Security on the new table.
-- -- Without this, any policies we create will not be enforced.

-- ALTER TABLE public.daily_motivation ENABLE ROW LEVEL SECURITY;

-- -- --------------------------------------------------------------------
-- -- POLICY: Allow public, anonymous read access
-- -- --------------------------------------------------------------------
-- -- This policy allows any user, whether they are logged in or not,
-- -- to view the records in this table. This is necessary so that your
-- -- React component can fetch the data and display it to everyone.
-- -- 'USING (true)' means the condition is always met for SELECT queries.

-- CREATE POLICY "Allow public read access"
-- ON public.daily_motivation
-- FOR SELECT
-- USING (true);

-- -- --------------------------------------------------------------------
-- -- NOTE ON WRITING DATA (INSERT, UPDATE, DELETE)
-- -- --------------------------------------------------------------------
-- -- We are intentionally NOT creating policies for INSERT, UPDATE, or
-- -- DELETE. This makes the table read-only from the public client-side API.
-- -- It is the most secure approach.
-- --
-- -- To add a new "Motivational Story of the Day," you should use
-- -- the Supabase Dashboard interface or a secure server-side function
-- -- with your 'service_role' key.


-- -- ====================================================================
-- --  3. SAMPLE INSERT STATEMENT
-- -- ====================================================================
-- -- Use this command to add your first piece of content to the table.
-- -- You can run this in the Supabase SQL Editor.
-- -- The 'id' and 'created_at' columns will be filled automatically.

INSERT INTO public.daily_motivation (name, quote, audioLink, imageLink)
VALUES (
  'Winston Churchill',
  'Success is not final, failure is not fatal: it is the courage to continue that counts.',
  'https://youraudio.storage.com/path/to/churchill_motivation.mp3', -- Replace with your actual audio URL
  'https://images.unsplash.com/photo-1552152370-fb05b252a1eb?q=80&w=2070&auto=format&fit=crop' -- Replace with your actual image URL
);

-- CREATE TABLE public.static_motivations (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   created_at timestamp with time zone NOT NULL DEFAULT now(),
--   title text NOT NULL,
--   full_story text NOT NULL,
--   imagelink text NOT NULL,
--   audiolink text, -- Audio is optional
--   category text NOT NULL,
--   "readTime" text NOT NULL, -- Quoted because of camelCase
--   CONSTRAINT static_motivations_pkey PRIMARY KEY (id)
-- );

-- -- Add a comment to the table for clarity in your database schema.
-- COMMENT ON TABLE public.static_motivations IS 'Stores a collection of motivational and mindful stories.';


-- -- ====================================================================
-- --  2. ROW LEVEL SECURITY (RLS) POLICIES
-- -- ====================================================================
-- -- First, we must enable Row Level Security on the new table.
-- -- Without this, any policies we create will not be enforced.

-- ALTER TABLE public.static_motivations ENABLE ROW LEVEL SECURITY;

-- -- --------------------------------------------------------------------
-- -- POLICY: Allow public, anonymous read access
-- -- --------------------------------------------------------------------
-- -- This policy allows any user (logged in or not) to read (SELECT) the
-- -- stories. This is essential for your Home page and Story Detail
-- -- page components to fetch the data they need to display.

-- CREATE POLICY "Allow public read access for all users"
-- ON public.static_motivations
-- FOR SELECT
-- USING (true);

-- -- --------------------------------------------------------------------
-- -- NOTE ON WRITE ACCESS (IMPORTANT FOR SECURITY)
-- -- --------------------------------------------------------------------
-- -- We are intentionally NOT creating policies for INSERT, UPDATE, or
-- -- DELETE. This makes the table read-only for your app users, which
-- -- is the most secure setup.
-- --
-- -- To add, edit, or delete stories, you should do so as an administrator
-- -- directly in the Supabase Table Editor.


-- -- ====================================================================
-- --  3. SAMPLE DATA INSERT STATEMENTS
-- -- ====================================================================
-- -- Use these commands to add your first few stories for testing.
-- -- The 'id' and 'created_at' columns are filled automatically.
-- -- The newline character '\n' is used to separate paragraphs in 'full_story'.

-- INSERT INTO public.static_motivations (title, full_story, imagelink, audiolink, category, "readTime")
-- VALUES (
--   'The Calm River',
--   'The river doesn''t rush. It flows. It moves with a gentle, persistent strength, carving its path through the landscape without hurry. This is the first lesson of the calm river: true progress is not about speed, but about steady, mindful movement.\n\nFind a comfortable place to sit, close your eyes, and imagine this river. Picture the sunlight dancing on its surface, the smooth stones beneath the current, and the green banks that hold it. This river is within you. It is your breath.\n\nInhale slowly, deeply, and feel the current of your breath flow in. Exhale just as slowly, and feel it release. Like the river, your breath is a constant, life-giving force. It asks for nothing but your attention. By focusing on this simple, natural rhythm, you anchor yourself in the present moment, letting go of past regrets and future anxieties.\n\nThe river teaches us acceptance. It doesn''t fight the rocks in its path; it flows around them. It embraces the rain that swells its banks and the sun that warms its waters. In the same way, we can learn to accept our thoughts and feelings without judgment, allowing them to pass like leaves floating downstream.',
--   'https://images.unsplash.com/photo-1502602898657-3e91760c0341?q=80&w=1000&auto=format&fit=crop',
--   'https://youraudio.storage.com/path/to/the_calm_river.mp3', -- Replace with a real audio URL
--   'Mindfulness',
--   '3 min'
-- );

-- INSERT INTO public.static_motivations (title, full_story, imagelink, audiolink, category, "readTime")
-- VALUES (
--   'Mountain of Resilience',
--   'Imagine a mountain. It stands tall through every season, unshakeable. Storms rage, winds howl, and snows fall, but the mountain remains. It is a symbol of profound resilience.\n\nYour inner strength is like this mountain. Challenges in life are like the weather—temporary and ever-changing. They may feel overwhelming in the moment, but they do not define your core. You have a foundation of resilience within you that can withstand any storm.\n\nBuilding this resilience is a practice. Each time you face a difficulty and choose to move forward, you are reinforcing your foundation. Each time you learn from a mistake, you add to your strength. You are not defined by the storms you face, but by the fact that you are still standing after they pass.',
--   'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1000&auto=format&fit=crop',
--   'https://youraudio.storage.com/path/to/mountain_of_resilience.mp3', -- Replace with a real audio URL
--   'Growth',
--   '5 min'
-- );

-- INSERT INTO public.static_motivations (title, full_story, imagelink, audiolink, category, "readTime")
-- VALUES (
--   'Garden of Gratitude',
--   'Your mind is a garden, and your thoughts are the seeds. You can choose to plant seeds of gratitude or seeds of complaint. What you nurture is what will grow.\n\nEach day, take a moment to tend to your garden. Acknowledge one small thing you are grateful for—the warmth of the sun, a kind word from a friend, the taste of your morning coffee. This simple act is like watering a seed of positivity.\n\nAt first, the changes may be small. But with consistent practice, your garden of gratitude will flourish. You will begin to notice more and more things to be thankful for. This shift in perspective doesn''t remove life''s difficulties, but it gives you a beautiful, resilient garden to find shelter in when challenges arise.',
--   'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1000&auto=format&fit=crop',
--   null, -- This story has no audio
--   'Wellness',
--   '4 min'
-- );


INSERT INTO "public"."daily_motivation" ("id", "created_at", "name", "quote", "audiolink", "imagelink") VALUES ('b91825c9-8002-541a-b153-4f9505b82b8e', '2025-09-18 17:17:00.98192+00', 'Akshay', 'You have the right to perform your duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty.', 'https://ohmpvatucgddpujxhwav.supabase.co/storage/v1/object/public/diary_images/WhatsApp%20Audio%202025-09-18%20at%2000.29.52_d5254319.mp3', 'https://t4.ftcdn.net/jpg/08/16/02/27/360_F_816022757_a8sLazVpFdQpJawXcZRC7RfYbV0X69BB.jpg');


-- INSERT INTO "public"."daily_motivation" ("id", "created_at", "name", "quote", "audiolink", "imagelink") VALUES ('b91825c9-8002-441a-b153-4f9505b82b8e', '2025-09-17 17:17:00.98192+00', 'Arjuna', 'My delusion is destroyed, my memory is restored by Your grace, O Krishna. I stand firm, free from doubt, and I will act according to Your word.', 'https://ohmpvatucgddpujxhwav.supabase.co/storage/v1/object/public/diary_images/Tired%20of%20Overthinking_%20Krishna%20Gave%20Arjun%20the%20Answer.mp3', 'https://i0.wp.com/picjumbo.com/wp-content/uploads/tiger-eyes-looking-from-the-bushes-free-image.jpeg?h=800&quality=80');

-- ALTER TABLE user_ai_summaries
-- ADD COLUMN prompt_count INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN personal_details TEXT;

create table public.chat_messages (
  id bigint generated by default as identity not null,
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  role text not null,
  content text not null,
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint chat_messages_role_check check ((role = any (array['user'::text, 'model'::text])))
) TABLESPACE pg_default;

create index IF not exists idx_chat_messages_user_id_created_at on public.chat_messages using btree (user_id, created_at desc) TABLESPACE pg_default;

CREATE OR REPLACE FUNCTION trim_chat_history(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    message_count INT;
    messages_to_delete_count INT;
BEGIN
    -- Count the total messages for the user
    SELECT count(*) INTO message_count
    FROM public.chat_messages
    WHERE user_id = p_user_id;

    -- We want to keep a maximum of 10 messages
    IF message_count > 10 THEN
        messages_to_delete_count := message_count - 10;

        -- Delete the oldest messages exceeding the limit
        DELETE FROM public.chat_messages
        WHERE id IN (
            SELECT id
            FROM public.chat_messages
            WHERE user_id = p_user_id
            ORDER BY created_at ASC
            LIMIT messages_to_delete_count
        );
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 1. Drop the old chat messages table
DROP TABLE IF EXISTS public.chat_messages;

-- 2. Create the new, optimized table to store chat turns in a single row
CREATE TABLE public.chat_turns (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_prompt TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  CONSTRAINT chat_turns_pkey PRIMARY KEY (id),
  CONSTRAINT chat_turns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- 3. Create an index for faster fetching of chat history for a user
CREATE INDEX IF NOT EXISTS idx_chat_turns_user_id_created_at ON public.chat_turns USING btree (user_id, created_at DESC);

-- 4. Update the database function to work with the new table structure.
-- This function will now keep the 5 most recent turns (5 rows).
DROP FUNCTION IF EXISTS trim_chat_history(uuid); -- Drop the old function
CREATE OR REPLACE FUNCTION trim_chat_turns(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    turn_count INT;
    turns_to_delete_count INT;
BEGIN
    -- Count the total turns for the user
    SELECT count(*) INTO turn_count
    FROM public.chat_turns
    WHERE user_id = p_user_id;

    -- We want to keep a maximum of 5 turns
    IF turn_count > 5 THEN
        turns_to_delete_count := turn_count - 5;

        -- Delete the oldest turns exceeding the limit
        DELETE FROM public.chat_turns
        WHERE id IN (
            SELECT id
            FROM public.chat_turns
            WHERE user_id = p_user_id
            ORDER BY created_at ASC
            LIMIT turns_to_delete_count
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- -- 1. Drop the old table to ensure a clean slate
-- DROP TABLE IF EXISTS public.chat_messages;
-- DROP TABLE IF EXISTS public.chat_turns; -- Also drop the new one in case it was created incorrectly

-- -- 2. Create the new, efficient table to store chat turns in a single row
-- CREATE TABLE public.chat_turns (
--   id BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
--   user_id UUID NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   user_prompt TEXT NOT NULL,
--   ai_response TEXT NOT NULL,
--   CONSTRAINT chat_turns_pkey PRIMARY KEY (id),
--   CONSTRAINT chat_turns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
-- );

-- -- 3. Add an index for fast lookups
-- CREATE INDEX IF NOT EXISTS idx_chat_turns_user_id_created_at ON public.chat_turns USING btree (user_id, created_at DESC);

-- -- 4. Drop any old database functions to avoid conflicts
-- DROP FUNCTION IF EXISTS trim_chat_history(uuid);
-- DROP FUNCTION IF EXISTS trim_chat_turns(uuid);

-- -- 5. Create the CORRECT database function to trim the new 'chat_turns' table
-- -- This function keeps the 5 most recent conversation turns (5 rows).
-- CREATE OR REPLACE FUNCTION trim_chat_history(p_user_id UUID)
-- RETURNS VOID AS $$
-- DECLARE
--     turn_count INT;
--     turns_to_delete_count INT;
-- BEGIN
--     -- Count the total turns (rows) for the user
--     SELECT count(*) INTO turn_count
--     FROM public.chat_turns
--     WHERE user_id = p_user_id;

--     -- We want to keep a maximum of 5 turns
--     IF turn_count > 5 THEN
--         turns_to_delete_count := turn_count - 5;

--         -- Delete the oldest turns exceeding the limit
--         DELETE FROM public.chat_turns
--         WHERE id IN (
--             SELECT id
--             FROM public.chat_turns
--             WHERE user_id = p_user_id
--             ORDER BY created_at ASC
--             LIMIT turns_to_delete_count
--         );
--     END IF;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- 6. Ensure the necessary columns exist on your other tables
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS personal_details TEXT;
-- ALTER TABLE user_ai_summaries ADD COLUMN IF NOT EXISTS prompt_count INTEGER DEFAULT 0;

create table public.chat_messages (
  id bigint generated by default as identity not null,
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  role text not null,
  content text not null,
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint chat_messages_role_check check ((role = any (array['user'::text, 'model'::text])))
) TABLESPACE pg_default;

create index IF not exists idx_chat_messages_user_id_created_at on public.chat_messages using btree (user_id, created_at desc) TABLESPACE pg_default;

-- Task 1: Update Database Schema
-- Goal: Prepare DB structure for optimized storage and cleanup.

-- Step 1: Add personal_details column in user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN personal_details JSONB;

-- Step 2: Create ai_chat_pairs table
CREATE TABLE public.ai_chat_pairs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security for the new table
ALTER TABLE public.ai_chat_pairs ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "Allow individual read access" ON public.ai_chat_pairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual insert access" ON public.ai_chat_pairs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual delete access" ON public.ai_chat_pairs FOR DELETE USING (auth.uid() = user_id);


-- Step 3: Update user_ai_summaries
-- Note: Assuming user_ai_summaries table already exists and has a user_id column.
-- If it doesn't exist, you'll need to create it first.
-- CREATE TABLE public.user_ai_summaries (
--     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--     ... other columns
-- );

ALTER TABLE public.user_ai_summaries
ADD COLUMN IF NOT EXISTS last_prompts TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS chat_counter INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS recommendations JSONB;


-- Step 4: Create an RPC function
CREATE OR REPLACE FUNCTION handle_ai_chat_exchange(
    user_prompt_text TEXT,
    ai_response_text TEXT
)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID := auth.uid();
    prompt_array TEXT[];
BEGIN
    -- Exit function if AI response is empty or null, indicating failure
    IF ai_response_text IS NULL OR ai_response_text = '' THEN
        RETURN;
    END IF;

    -- Insert the prompt and response pair
    INSERT INTO public.ai_chat_pairs (user_id, user_prompt, ai_response)
    VALUES (current_user_id, user_prompt_text, ai_response_text);

    -- Update user_ai_summaries
    -- Get the current array of prompts
    SELECT last_prompts INTO prompt_array
    FROM public.user_ai_summaries
    WHERE user_id = current_user_id;

    -- Append the new prompt
    prompt_array := array_append(prompt_array, user_prompt_text);

    -- Trim the array to the last 5 prompts
    IF array_length(prompt_array, 1) > 5 THEN
        prompt_array := prompt_array[array_length(prompt_array, 1)-4:array_length(prompt_array, 1)];
    END IF;

    -- Upsert the updated summary information
    INSERT INTO public.user_ai_summaries (user_id, last_prompts, chat_counter)
    VALUES (current_user_id, prompt_array, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        last_prompts = prompt_array,
        chat_counter = user_ai_summaries.chat_counter + 1;

    -- Delete oldest entries beyond 10 total for the user
    DELETE FROM public.ai_chat_pairs
    WHERE id IN (
        SELECT id
        FROM public.ai_chat_pairs
        WHERE user_id = current_user_id
        ORDER BY created_at ASC
        OFFSET 10
    );

END;
$$ LANGUAGE plpgsql;

-- INSERT INTO "public"."daily_motivation" ("id", "created_at", "name", "quote", "audiolink", "imagelink", "created_by_username") VALUES ('b91825c9-8002-441a-b153-444505b82b8e', '2025-09-19 17:17:00.98192+00', 'Arjuna', 'My delusion is destroyed, my memory is restored by Your grace, O Krishna. I stand firm, free from doubt, and I will act according to Your word.', 'https://ohmpvatucgddpujxhwav.supabase.co/storage/v1/object/public/diary_images/Tired%20of%20Overthinking_%20Krishna%20Gave%20Arjun%20the%20Answer.mp3', 'https://i0.wp.com/picjumbo.com/wp-content/uploads/tiger-eyes-looking-from-the-bushes-free-image.jpeg?h=800&quality=80', 'Akshay');

-- 1. Enable Row-Level Security
ALTER TABLE public.daily_motivation ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone to SELECT (read) all rows
CREATE POLICY "Allow all selects" 
ON public.daily_motivation
FOR SELECT
USING (true);

-- 3. Allow anyone to INSERT (add new rows)
CREATE POLICY "Allow all inserts" 
ON public.daily_motivation
FOR INSERT
WITH CHECK (true);

-- 4. Allow anyone to UPDATE all rows
CREATE POLICY "Allow all updates"
ON public.daily_motivation
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 5. Allow anyone to DELETE rows
CREATE POLICY "Allow all deletes"
ON public.daily_motivation
FOR DELETE
USING (true);
