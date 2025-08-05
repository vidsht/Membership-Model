-- Insert a test activity for admin dashboard display
INSERT INTO activities (
  type, title, description, userId, userName, userEmail, userType, timestamp, icon
) VALUES (
  'user_registered',
  'New User Registered',
  'A new user has registered for membership.',
  1,
  'Admin User',
  'admin@example.com',
  'admin',
  NOW(),
  'fa-user-plus'
);
