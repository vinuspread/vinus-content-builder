CREATE TABLE blog_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id UUID NOT NULL UNIQUE REFERENCES generated_contents(id) ON DELETE CASCADE,
  blog_title TEXT NOT NULL,
  blog_content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_blog_contents_updated_at
  BEFORE UPDATE ON blog_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE blog_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON blog_contents FOR ALL USING (true) WITH CHECK (true);
