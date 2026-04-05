-- Insert missing profiles (trigger will force status to 'pending')
INSERT INTO public.profiles (user_id, name, email, status)
VALUES
  ('a98fb452-b5a4-4a7b-832f-0ed109997b0f', 'HOD', 'hod@gmail.com', 'active'),
  ('0565dc6c-cf9e-4c1b-a769-1b619efefb44', 'CC', 'cc@gmail.com', 'active'),
  ('7116c501-90e4-4c56-baf6-a9b36767f715', 'Teacher', 'teacher@gmail.com', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- Force status to active (bypass trigger which only fires on INSERT)
UPDATE public.profiles SET status = 'active' WHERE user_id IN (
  'a98fb452-b5a4-4a7b-832f-0ed109997b0f',
  '0565dc6c-cf9e-4c1b-a769-1b619efefb44',
  '7116c501-90e4-4c56-baf6-a9b36767f715'
);

-- Insert roles
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('a98fb452-b5a4-4a7b-832f-0ed109997b0f', 'hod'),
  ('0565dc6c-cf9e-4c1b-a769-1b619efefb44', 'coordinator'),
  ('7116c501-90e4-4c56-baf6-a9b36767f715', 'teacher')
ON CONFLICT (user_id, role) DO NOTHING;