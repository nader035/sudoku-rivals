# Supabase Database Setup Guide

Complete guide for setting up the Sudoku Rival database with PostgreSQL, Realtime, and Row Level Security.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Detailed Setup](#detailed-setup)
- [Database Schema](#database-schema)
- [Functions Reference](#functions-reference)
- [Triggers Reference](#triggers-reference)
- [Security Policies](#security-policies)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

1. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Database Access**
   - Access to Supabase SQL Editor
   - Or PostgreSQL client (psql, pgAdmin, etc.)

---

## 🚀 Quick Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: sudoku-rival
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### Step 2: Get Credentials

1. Go to **Settings** > **API**
2. Copy the following:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (long string)
3. Save these for your Angular environment files

### Step 3: Run Migrations

1. Open **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy and paste the contents of each migration file **in order**:

```sql
-- 1. Run 001_create_tables.sql
-- Copy entire file content and execute

-- 2. Run 002_create_functions.sql
-- Copy entire file content and execute

-- 3. Run 003_create_triggers.sql
-- Copy entire file content and execute

-- 4. Run 004_enable_realtime.sql
-- Copy entire file content and execute

-- 5. Run 005_fix_player_rls.sql
-- Replaces the recursive players admin policy with is_admin()

-- 6. Run 006_fix_room_rls.sql
-- Replaces the recursive rooms and room_players policies with SECURITY DEFINER helpers

-- 7. Run 007_create_room_rpc.sql
-- Adds SECURITY DEFINER room creation for guest/auth flows

-- 8. Run 008_fix_realtime_visibility.sql
-- Fixes room_players visibility for non-members and finished rooms for queries

-- 9. Run 009_fix_player_count_double_counting.sql
-- Fixes rooms appearing full on creation (current_players double-counting bug)
```

4. Execute each migration by clicking **Run** or pressing `Ctrl+Enter`
5. Verify success messages appear

### Step 4: Verify Setup

Run this query to verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output:

- `game_history`
- `notifications`
- `players`
- `room_players`
- `rooms`

---

## 📖 Detailed Setup

### Migration Files Overview

| File                       | Purpose        | Tables/Objects Created                                |
| -------------------------- | -------------- | ----------------------------------------------------- |
| `001_create_tables.sql`    | Core schema    | 5 tables with indexes                                 |
| `002_create_functions.sql` | Business logic | 10+ PostgreSQL functions                              |
| `003_create_triggers.sql`  | Automation     | 12+ triggers for data consistency                     |
| `004_enable_realtime.sql`  | Live updates   | RLS policies + Realtime config                        |
| `005_fix_player_rls.sql`   | RLS repair     | Removes recursive `players` admin policy              |
| `006_fix_room_rls.sql`     | RLS repair     | Removes recursive `rooms` and `room_players` policies |
| `007_create_room_rpc.sql`  | RLS repair     | Adds SECURITY DEFINER room creation RPC               |

### Manual Execution (Alternative)

If you prefer using `psql` or another PostgreSQL client:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations in order
\i migrations/001_create_tables.sql
\i migrations/002_create_functions.sql
\i migrations/003_create_triggers.sql
\i migrations/004_enable_realtime.sql
\\i migrations/005_fix_player_rls.sql
\\i migrations/006_fix_room_rls.sql
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│   players   │
│─────────────│
│ id (PK)     │
│ auth_id (FK)│──────┐
│ username    │      │
│ email       │      │
│ total_wins  │      │
│ ...         │      │
└─────────────┘      │
       │             │
       │ 1:N         │
       │             │
┌──────▼──────┐      │
│    rooms    │      │
│─────────────│      │
│ id (PK)     │      │
│ host_id (FK)│──────┘
│ difficulty  │
│ puzzle      │
│ solution    │
│ status      │
│ ...         │
└─────────────┘
       │
       │ 1:N
       │
┌──────▼──────────┐
│  room_players   │
│─────────────────│
│ id (PK)         │
│ room_id (FK)    │
│ player_id (FK)  │
│ progress        │
│ mistakes        │
│ board           │
│ ...             │
└─────────────────┘
```

### Tables

#### `players`

Stores user profiles and statistics.

**Key Columns:**

- `id`: UUID primary key
- `auth_id`: Reference to Supabase auth.users
- `username`: Unique username
- `total_wins`, `total_games`: Overall statistics
- `easy_wins`, `medium_wins`, `hard_wins`, `expert_wins`: Per-difficulty stats
- `role`: 'player', 'moderator', or 'admin'

#### `rooms`

Multiplayer game rooms.

**Key Columns:**

- `id`: UUID primary key
- `name`: Room display name
- `difficulty`: 'easy', 'medium', 'hard', or 'expert'
- `max_players`: 2-6 players
- `status`: 'waiting', 'active', 'finished', or 'cancelled'
- `puzzle`, `solution`: JSONB 9x9 arrays
- `host_id`: Room creator

#### `room_players`

Junction table for room participation.

**Key Columns:**

- `room_id`, `player_id`: Composite foreign keys
- `progress`: 0-100 completion percentage
- `mistakes`: Error count
- `board`: JSONB current puzzle state
- `finish_position`: 1st, 2nd, 3rd, etc.

#### `game_history`

Completed game records.

**Key Columns:**

- `room_id`: Reference to completed room
- `winner_id`: Player who won
- `difficulty`: Game difficulty
- `puzzle`, `solution`: For replay functionality

#### `notifications`

User notifications.

**Key Columns:**

- `player_id`: Recipient
- `type`: 'game_invite', 'game_start', 'game_finish', etc.
- `is_read`: Read status
- `room_id`, `sender_id`: Optional references

---

## 🔧 Functions Reference

### Game Logic Functions

#### `get_leaderboard(difficulty, limit)`

Returns top players by wins.

```sql
-- Get top 10 players for hard difficulty
SELECT * FROM get_leaderboard('hard', 10);

-- Get overall top 20 players
SELECT * FROM get_leaderboard(NULL, 20);
```

**Returns:**

- `player_id`, `username`, `avatar_url`
- `total_wins`, `difficulty_wins`
- `win_rate`, `average_time`
- `rank`

#### `update_player_stats(player_id, won, difficulty, completion_time)`

Updates player statistics after game.

```sql
-- Player won a hard game in 300 seconds
SELECT update_player_stats(
  'player-uuid',
  true,
  'hard',
  300
);
```

#### `check_room_completion(room_id)`

Checks if all players finished and finalizes room.

```sql
-- Check if room is complete
SELECT check_room_completion('room-uuid');
```

**Returns:** `true` if room completed, `false` otherwise

### Room Management Functions

#### `join_room(room_id, player_id, password)`

Handles player joining with validation.

```sql
-- Join public room
SELECT join_room('room-uuid', 'player-uuid', NULL);

-- Join private room with password
SELECT join_room('room-uuid', 'player-uuid', 'secret123');
```

**Returns:**

```json
{
  "success": true,
  "room_id": "uuid"
}
```

Or error:

```json
{
  "success": false,
  "error": "Room is full"
}
```

#### `start_room(room_id, player_id)`

Starts game (host only).

```sql
-- Host starts the game
SELECT start_room('room-uuid', 'host-player-uuid');
```

#### `update_player_progress(room_id, player_id, board, progress, mistakes)`

Updates player progress in room.

```sql
-- Update progress to 75% with 2 mistakes
SELECT update_player_progress(
  'room-uuid',
  'player-uuid',
  '[[1,2,3,...]]'::jsonb,  -- Current board state
  75,                        -- Progress percentage
  2                          -- Mistakes count
);
```

### Utility Functions

#### `get_recent_matches(player_id, limit)`

Returns recent matches for player.

```sql
-- Get last 10 matches
SELECT * FROM get_recent_matches('player-uuid', 10);
```

#### `create_notification(player_id, type, title, message, room_id, sender_id)`

Creates notification.

```sql
-- Create game invite notification
SELECT create_notification(
  'recipient-uuid',
  'game_invite',
  'Game Invitation',
  'John invited you to play!',
  'room-uuid',
  'sender-uuid'
);
```

---

## ⚡ Triggers Reference

### Automatic Triggers

| Trigger                                 | Table         | Event  | Purpose               |
| --------------------------------------- | ------------- | ------ | --------------------- |
| `update_players_updated_at`             | players       | UPDATE | Auto-update timestamp |
| `notify_room_player_joined`             | room_players  | INSERT | Notify on join        |
| `notify_room_started`                   | rooms         | UPDATE | Notify on start       |
| `notify_room_finished`                  | rooms         | UPDATE | Notify on finish      |
| `update_room_player_count_on_insert`    | room_players  | INSERT | Increment count       |
| `update_room_player_count_on_delete`    | room_players  | DELETE | Decrement count       |
| `check_room_completion_on_finish`       | room_players  | UPDATE | Check completion      |
| `prevent_room_modification_after_start` | rooms         | UPDATE | Prevent changes       |
| `validate_player_progress`              | room_players  | UPDATE | Validate progress     |
| `auto_create_player_on_auth_signup`     | auth.users    | INSERT | Create player         |
| `mark_notification_read`                | notifications | UPDATE | Set read_at           |

### Trigger Behavior Examples

**Player Joins Room:**

```
1. INSERT into room_players
2. Trigger: update_room_player_count_on_insert
   → Increments rooms.current_players
3. Trigger: notify_room_player_joined
   → Creates notifications for other players
```

**Player Completes Game:**

```
1. UPDATE room_players SET progress = 100
2. Trigger: validate_player_progress
   → Sets is_finished = true, finish_position
3. Trigger: check_room_completion_on_finish
   → Calls check_room_completion()
   → If all done: updates room status, creates game_history
```

---

## 🔒 Security Policies

### Row Level Security (RLS)

All tables have RLS enabled with fine-grained policies.

#### Players Table

- ✅ **SELECT**: Everyone can view active, non-banned players
- ✅ **SELECT**: Users can view their own full profile
- ✅ **UPDATE**: Users can update their own profile
- ✅ **INSERT**: Users can create their own profile
- ✅ **ALL**: Admins can manage all players

#### Rooms Table

- ✅ **SELECT**: Everyone can view waiting/active rooms
- ✅ **SELECT**: Players can view rooms they're in
- ✅ **INSERT**: Authenticated users can create rooms
- ✅ **UPDATE**: Host can update their room
- ✅ **DELETE**: Host can delete waiting rooms

#### Room Players Table

- ✅ **SELECT**: Players can view participants in their rooms
- ✅ **INSERT**: Players can join rooms
- ✅ **UPDATE**: Players can update their own progress
- ✅ **DELETE**: Players can leave waiting rooms

#### Game History Table

- ✅ **SELECT**: Everyone can view game history
- ❌ **INSERT**: Only system (via triggers)

#### Notifications Table

- ✅ **SELECT**: Users can view their own notifications
- ✅ **UPDATE**: Users can mark their notifications as read
- ✅ **DELETE**: Users can delete their notifications
- ✅ **INSERT**: System can create notifications

### Helper Functions

```sql
-- Check if current user is admin
SELECT is_admin();

-- Check if current user is moderator or admin
SELECT is_moderator();

-- Get current player ID
SELECT current_player_id();
```

---

## 🧪 Testing

### Test Data Setup

```sql
-- Create test players
INSERT INTO players (username, email, role)
VALUES
  ('alice', 'alice@example.com', 'player'),
  ('bob', 'bob@example.com', 'player'),
  ('admin', 'admin@example.com', 'admin');

-- Create test room
INSERT INTO rooms (name, difficulty, host_id, puzzle, solution, initial_board, max_players)
SELECT
  'Test Room',
  'easy',
  id,
  '[[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0]]'::jsonb,
  '[[1,2,3,4,5,6,7,8,9],[4,5,6,7,8,9,1,2,3],[7,8,9,1,2,3,4,5,6],[2,3,4,5,6,7,8,9,1],[5,6,7,8,9,1,2,3,4],[8,9,1,2,3,4,5,6,7],[3,4,5,6,7,8,9,1,2],[6,7,8,9,1,2,3,4,5],[9,1,2,3,4,5,6,7,8]]'::jsonb,
  '[[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0]]'::jsonb,
  4
FROM players WHERE username = 'alice';
```

### Test Queries

```sql
-- Test leaderboard
SELECT * FROM get_leaderboard('easy', 5);

-- Test room joining
SELECT join_room(
  (SELECT id FROM rooms WHERE name = 'Test Room'),
  (SELECT id FROM players WHERE username = 'bob'),
  NULL
);

-- Test room starting
SELECT start_room(
  (SELECT id FROM rooms WHERE name = 'Test Room'),
  (SELECT id FROM players WHERE username = 'alice')
);

-- Test progress update
SELECT update_player_progress(
  (SELECT id FROM rooms WHERE name = 'Test Room'),
  (SELECT id FROM players WHERE username = 'bob'),
  '[[1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0]]'::jsonb,
  10,
  0
);
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "relation does not exist"

**Solution:** Run migrations in correct order (001 → 002 → 003 → 004)

#### Issue: "permission denied for table"

**Solution:** Check RLS policies are created (run 004_enable_realtime.sql)

#### Issue: Players or lobby data return 500s with recursive policy errors

**Solution:** Run 005_fix_player_rls.sql after 004_enable_realtime.sql so the admin policy uses is_admin() instead of querying players recursively.

#### Issue: Lobby rooms or room participants still return 500s

**Solution:** Run 006_fix_room_rls.sql so the rooms and room_players policies use SECURITY DEFINER helpers instead of self-referencing queries.

#### Issue: "function does not exist"

**Solution:** Run 002_create_functions.sql

#### Issue: Realtime not working

**Solution:**

1. Check Realtime is enabled in Supabase Dashboard
2. Verify tables are added to publication:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### Verification Queries

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check all functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Check all triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Supabase logs in Dashboard > Logs
3. Open an issue on GitHub
4. Contact support@sudoku-rival.com

---

<div align="center">

**Database setup complete! 🎉**

Next: Update your Angular environment files with Supabase credentials

</div>
