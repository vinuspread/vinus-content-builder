CREATE TABLE blog_style_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_blog_style_references_updated_at
  BEFORE UPDATE ON blog_style_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE blog_style_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON blog_style_references FOR ALL USING (true) WITH CHECK (true);
