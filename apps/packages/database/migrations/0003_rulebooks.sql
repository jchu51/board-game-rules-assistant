CREATE TABLE IF NOT EXISTS rulebooks (
  id UUID PRIMARY KEY,
  game_name TEXT NOT NULL,
  pdf_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  pdf_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
