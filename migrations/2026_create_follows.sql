-- Phase X4: User follows (illustrative)
CREATE TABLE follows (
  user_id TEXT NOT NULL,
  host_user_id TEXT NOT NULL,
  PRIMARY KEY (user_id, host_user_id)
);
