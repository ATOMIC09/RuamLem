# Supabase Analytics Tables Setup

This document contains SQL scripts to set up the analytics tracking system for post views and file downloads.

## Prerequisites

- Supabase project created
- Database access via SQL Editor
- Authentication system already set up

## Tables Overview

1. **post_views** - Tracks views for each post with IP-based deduplication
2. **file_downloads** - Tracks downloads for each file with IP-based tracking

---

## 1. Create `post_views` Table

This table tracks post views with 24-hour deduplication per IP address.

```sql
-- Create post_views table
CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id INTEGER NOT NULL,
    user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX idx_post_views_user_id ON public.post_views(user_id);
CREATE INDEX idx_post_views_ip_address ON public.post_views(ip_address);
CREATE INDEX idx_post_views_viewed_at ON public.post_views(viewed_at);
CREATE INDEX idx_post_views_post_ip_viewed ON public.post_views(post_id, ip_address, viewed_at);

-- Add comments for documentation
COMMENT ON TABLE public.post_views IS 'Tracks post views with IP-based deduplication (24 hours)';
COMMENT ON COLUMN public.post_views.id IS 'Primary key';
COMMENT ON COLUMN public.post_views.post_id IS 'Reference to the post being viewed (INTEGER)';
COMMENT ON COLUMN public.post_views.user_id IS 'Optional: User ID if authenticated';
COMMENT ON COLUMN public.post_views.ip_address IS 'IP address of the viewer (IPv4 or IPv6)';
COMMENT ON COLUMN public.post_views.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN public.post_views.viewed_at IS 'Timestamp when the view occurred';
COMMENT ON COLUMN public.post_views.created_at IS 'Record creation timestamp';
```

---

## 2. Create `file_downloads` Table

This table tracks file downloads with IP-based tracking (no deduplication - each download is counted).

```sql
-- Create file_downloads table
CREATE TABLE IF NOT EXISTS public.file_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    file_name VARCHAR(500),
    file_size BIGINT,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_file_downloads_file_id ON public.file_downloads(file_id);
CREATE INDEX idx_file_downloads_post_id ON public.file_downloads(post_id);
CREATE INDEX idx_file_downloads_user_id ON public.file_downloads(user_id);
CREATE INDEX idx_file_downloads_ip_address ON public.file_downloads(ip_address);
CREATE INDEX idx_file_downloads_downloaded_at ON public.file_downloads(downloaded_at);

-- Add comments for documentation
COMMENT ON TABLE public.file_downloads IS 'Tracks file downloads (each download is counted)';
COMMENT ON COLUMN public.file_downloads.id IS 'Primary key';
COMMENT ON COLUMN public.file_downloads.file_id IS 'Reference to the file being downloaded (INTEGER)';
COMMENT ON COLUMN public.file_downloads.post_id IS 'Reference to the post containing the file (INTEGER)';
COMMENT ON COLUMN public.file_downloads.user_id IS 'Optional: User ID if authenticated';
COMMENT ON COLUMN public.file_downloads.ip_address IS 'IP address of the downloader (IPv4 or IPv6)';
COMMENT ON COLUMN public.file_downloads.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN public.file_downloads.file_name IS 'Name of the downloaded file';
COMMENT ON COLUMN public.file_downloads.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN public.file_downloads.downloaded_at IS 'Timestamp when the download occurred';
COMMENT ON COLUMN public.file_downloads.created_at IS 'Record creation timestamp';
```

---

## 3. Enable Row Level Security (RLS)

Enable RLS to secure the tables while allowing the backend service to write.

```sql
-- Enable RLS on post_views
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Enable RLS on file_downloads
ALTER TABLE public.file_downloads ENABLE ROW LEVEL SECURITY;
```

---

## 4. Create RLS Policies

### For `post_views` table:

```sql
-- Allow anyone to view their own views (if authenticated)
CREATE POLICY "Users can view their own post views"
    ON public.post_views
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow service role to insert views (backend API)
CREATE POLICY "Service role can insert post views"
    ON public.post_views
    FOR INSERT
    WITH CHECK (true);

-- Allow service role to read all views (for statistics)
CREATE POLICY "Service role can read all post views"
    ON public.post_views
    FOR SELECT
    USING (true);
```

### For `file_downloads` table:

```sql
-- Allow anyone to view their own downloads (if authenticated)
CREATE POLICY "Users can view their own downloads"
    ON public.file_downloads
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow service role to insert downloads (backend API)
CREATE POLICY "Service role can insert downloads"
    ON public.file_downloads
    FOR INSERT
    WITH CHECK (true);

-- Allow service role to read all downloads (for statistics)
CREATE POLICY "Service role can read all downloads"
    ON public.file_downloads
    FOR SELECT
    USING (true);
```

---

## 5. Create Useful Views (Optional but Recommended)

### View Count Per Post

```sql
CREATE OR REPLACE VIEW public.post_view_counts AS
SELECT 
    post_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    MAX(viewed_at) as last_viewed_at
FROM public.post_views
GROUP BY post_id;

COMMENT ON VIEW public.post_view_counts IS 'Aggregated view counts per post';
```

### Download Count Per File

```sql
CREATE OR REPLACE VIEW public.file_download_counts AS
SELECT 
    file_id,
    post_id,
    file_name,
    COUNT(*) as total_downloads,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    SUM(file_size) as total_bytes_downloaded,
    MAX(downloaded_at) as last_downloaded_at
FROM public.file_downloads
GROUP BY file_id, post_id, file_name;

COMMENT ON VIEW public.file_download_counts IS 'Aggregated download counts per file';
```

### Daily Analytics View

```sql
CREATE OR REPLACE VIEW public.daily_analytics AS
SELECT 
    DATE(viewed_at) as date,
    COUNT(DISTINCT pv.post_id) as posts_viewed,
    COUNT(*) as total_views,
    COUNT(DISTINCT pv.user_id) as active_users,
    COALESCE(fd.total_downloads, 0) as total_downloads
FROM public.post_views pv
LEFT JOIN (
    SELECT 
        DATE(downloaded_at) as date,
        COUNT(*) as total_downloads
    FROM public.file_downloads
    GROUP BY DATE(downloaded_at)
) fd ON DATE(pv.viewed_at) = fd.date
GROUP BY DATE(viewed_at), fd.total_downloads
ORDER BY date DESC;

COMMENT ON VIEW public.daily_analytics IS 'Daily aggregated analytics for views and downloads';
```

---

## 6. Verification Queries

After setup, verify the tables are working correctly:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('post_views', 'file_downloads');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('post_views', 'file_downloads');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('post_views', 'file_downloads');

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('post_views', 'file_downloads');
```

---

## 7. Test Data (Optional - for development)

Insert some test data to verify the setup:

```sql
-- Test post_views (replace UUIDs with actual values from your database)
INSERT INTO public.post_views (post_id, ip_address, user_agent)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '192.168.1.1', 'Mozilla/5.0'),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.2', 'Mozilla/5.0'),
    ('00000000-0000-0000-0000-000000000002', '192.168.1.1', 'Chrome/120.0');

-- Test file_downloads (replace UUIDs with actual values)
INSERT INTO public.file_downloads (file_id, post_id, ip_address, user_agent, file_name, file_size)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '192.168.1.1', 'Mozilla/5.0', 'test.pdf', 1024000),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '192.168.1.2', 'Chrome/120.0', 'document.docx', 2048000);

-- Query test data
SELECT * FROM public.post_view_counts;
SELECT * FROM public.file_download_counts;
SELECT * FROM public.daily_analytics;
```

---

## 8. Maintenance Queries

### Clean up old views (older than 1 year)

```sql
DELETE FROM public.post_views 
WHERE viewed_at < NOW() - INTERVAL '1 year';
```

### Clean up old downloads (older than 1 year)

```sql
DELETE FROM public.file_downloads 
WHERE downloaded_at < NOW() - INTERVAL '1 year';
```

### Get storage usage

```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('public.post_views')) as post_views_size,
    pg_size_pretty(pg_total_relation_size('public.file_downloads')) as file_downloads_size;
```

---

## Important Notes

1. **IP Address Storage**: IPv4 addresses use up to 15 characters, IPv6 up to 45 characters.
2. **Deduplication**: Post views use 24-hour deduplication per IP in the backend logic, not database constraints.
3. **Service Role**: Your backend needs to use the Supabase service role key to bypass RLS for insertions.
4. **Privacy**: Consider your local privacy laws when storing IP addresses. You may need to:
   - Hash IP addresses
   - Implement data retention policies
   - Add GDPR compliance features
5. **Performance**: Indexes are created for common queries. Monitor and adjust as needed.
6. **Backup**: Always backup your database before running production migrations.

---

## Integration with Backend

Your backend (RuamLem-backend) already has these tables integrated:

- **Repository**: `src/repositories/analytics-repo.ts`
- **Controller**: `src/controllers/analytics-controller.ts`
- **Routes**: `src/routes/analytics-route.ts`

The backend expects these exact table structures, so don't modify column names or types.

---

## Next Steps

After running this SQL:

1. ✅ Tables created: `post_views`, `file_downloads`
2. ✅ Indexes created for performance
3. ✅ RLS enabled with proper policies
4. ✅ Helper views created for analytics
5. ➡️ Implement view tracking in frontend (`src/app/post/[id]/page.tsx`)
6. ➡️ Implement download tracking in frontend (wherever files are downloaded)

---

## Support

If you encounter any issues:

1. Check Supabase logs in the dashboard
2. Verify RLS policies are correct
3. Ensure backend is using service role key for insertions
4. Check that UUIDs match between tables (posts, files)

Last updated: October 19, 2025
