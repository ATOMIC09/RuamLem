# Supabase Database Setup for Like/Engagement System

## 📋 Required Database Changes

### 1. Create `post_likes` Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id) -- Prevent duplicate likes from same user on same post
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON public.post_likes(created_at);

-- Enable Row Level Security
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_likes
-- Allow users to view all likes
CREATE POLICY "Users can view all likes"
    ON public.post_likes
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Users can create their own likes"
    ON public.post_likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
CREATE POLICY "Users can delete their own likes"
    ON public.post_likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.post_likes IS 'Stores user likes/reactions for posts';
```

### 2. Verify Existing Tables

Make sure these tables exist (they should already be in your database):

- ✅ `posts` - Main posts table
- ✅ `profiles` - User profiles table  
- ✅ `comments` - Comments table
- ✅ `files` - File attachments table

### 3. Optional: Add Trigger for Like Count Caching

If you want to cache like counts on the posts table for performance:

```sql
-- Add like_count column to posts table (optional)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create function to update like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts 
        SET like_count = like_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts 
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON public.post_likes;
CREATE TRIGGER trigger_update_post_like_count
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();
```

## 🧪 Test Queries

After creating the table, test with these queries:

### Insert a test like:
```sql
INSERT INTO public.post_likes (user_id, post_id)
VALUES ('your-user-uuid-here', 1);
```

### Count likes for a post:
```sql
SELECT COUNT(*) as like_count
FROM public.post_likes
WHERE post_id = 1;
```

### Get all likes with user info:
```sql
SELECT 
    pl.*,
    p.first_name,
    p.last_name,
    posts.title
FROM public.post_likes pl
LEFT JOIN public.profiles p ON pl.user_id = p.uuid
LEFT JOIN public.posts ON pl.post_id = posts.id
WHERE pl.post_id = 1
ORDER BY pl.created_at DESC;
```

### Get user's liked posts:
```sql
SELECT 
    posts.*,
    pl.created_at as liked_at
FROM public.posts
INNER JOIN public.post_likes pl ON posts.id = pl.post_id
WHERE pl.user_id = 'your-user-uuid-here'
ORDER BY pl.created_at DESC;
```

## 🔒 Security Notes

1. **Row Level Security (RLS)** is enabled to ensure data protection
2. Users can only create/delete their own likes
3. All users can view like counts (read-only)
4. Unique constraint prevents duplicate likes

## 📊 Database Schema

```
post_likes
├── id (BIGSERIAL, PRIMARY KEY)
├── user_id (UUID, FOREIGN KEY -> auth.users)
├── post_id (BIGINT, FOREIGN KEY -> posts)
├── created_at (TIMESTAMP)
└── UNIQUE(user_id, post_id)
```

## ✅ Verification Checklist

After running the SQL:

- [ ] `post_likes` table created
- [ ] Indexes created successfully
- [ ] RLS policies applied
- [ ] Test insert works
- [ ] Test delete works
- [ ] Count queries return correct results
- [ ] Unique constraint prevents duplicates
- [ ] Backend API endpoints work (run `bun run dev` in backend)
- [ ] Frontend can fetch and toggle likes

## 🚀 Next Steps

1. Run the SQL in Supabase SQL Editor
2. Restart your backend server (`bun run dev`)
3. Test the like functionality in your frontend
4. Check admin dashboard for totalLikes statistics

## 🔗 API Endpoints Created

The backend now has these endpoints:

- `POST /like/toggle` - Toggle like on a post (requires auth)
- `POST /like/status` - Get like status for a post
- `POST /like/multiple` - Get like counts for multiple posts
- `GET /stats` - Now includes `totalLikes` in response
