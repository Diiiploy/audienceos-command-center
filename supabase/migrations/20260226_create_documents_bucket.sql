-- Create the 'documents' storage bucket for Knowledge Base file uploads
-- This was commented out in 001_initial_schema.sql and never applied

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- RLS: Allow authenticated users to upload to their agency's folder
-- Storage path pattern: {agency_id}/{category}/{filename}
CREATE POLICY "Agency members can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM "user" WHERE id = auth.uid()
  )
);

-- RLS: Allow authenticated users to read their agency's documents
CREATE POLICY "Agency members can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM "user" WHERE id = auth.uid()
  )
);

-- RLS: Allow authenticated users to delete their agency's documents
CREATE POLICY "Agency members can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM "user" WHERE id = auth.uid()
  )
);
