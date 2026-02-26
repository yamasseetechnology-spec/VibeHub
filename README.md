# VibeHub - Complete Setup Guide

## Quick Start

### 1. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the left sidebar
3. Copy and paste the contents of `supabase/migrations/001-full-schema.sql`
4. Click **Run** to execute the migration

### 2. Get Your API Keys

Create accounts at each service and get your API keys:

| Service | URL | Where to Find Keys |
|---------|-----|-------------------|
| Clerk | clerk.com | Dashboard > API Keys |
| Supabase | supabase.com | Settings > API |
| Cloudinary | cloudinary.com | Dashboard > API Keys |
| ImageKit | imagekit.io | Developer > API Keys |
| Upstash | upstash.com | Redis > REST API |
| Firebase | firebase.google.com | Project Settings |

### 3. Configure Environment Variables

1. Copy `env.example` to `.env.local` (or `.env` for production)
2. Fill in all your API keys
3. Update the Square payment links with your own

### 4. Deploy

The simplest deployment is to use **Netlify** or **Vercel**:

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### Netlify
```bash
# Drag and drop the 'upload this' folder to Netlify
# Or use Netlify CLI
netlify deploy --prod
```

---

## Features Included

### Core Features
- ✅ User Authentication (Clerk)
- ✅ Profile Customization (themes, banners, music player)
- ✅ Top 8 Vibes
- ✅ Posts (text, image, video)
- ✅ 6 Reactions + Wave feature
- ✅ Threaded Comments
- ✅ Audio Comments (60s)
- ✅ Follow System
- ✅ Friends System

### Content
- ✅ Channels & Videos
- ✅ Marketplace
- ✅ Status Channels
- ✅ Direct Messages
- ✅ Notifications
- ✅ Explore & Trending

### New Features
- ✅ **Sync Spaces** - Live chat rooms (24hr, 125 users max, glow effects)
- ✅ **I Like Your Vibe** - Boost other users
- ✅ Settings Menu
- ✅ Report System
- ✅ Post Editing (15 min window)
- ✅ Link Previews
- ✅ Reputation/Vibe Score
- ✅ Verified Badges

### Payments
- ✅ $1 Signup Fee (Square)
- ✅ $1 Marketplace Listing Fee

---

## Sync Spaces Feature

Live chat rooms with these features:
- **24-hour duration** - Auto-expire after 24 hours
- **125 user limit** - Max users per room
- **Room admin** - Creator can kick users
- **Text-only** - No images or audio
- **Glow effects** - Username glows based on activity:
  - 0-5 messages: No glow
  - 6-15: 🟢 Green
  - 16-30: 🟡 Yellow
  - 31-50: 🟠 Orange
  - 51+: 🔴 Red (pulsing)
- **Quick reactions**: 👍 ❤️ 😂 🔥 👀

---

## Database Schema

The migration creates these tables:
- `users` - User profiles, settings, payment status
- `posts` - Timeline posts
- `comments` - Threaded comments
- `reactions` - Post reactions
- `channels` - YouTube-style channels
- `videos` - Channel videos
- `messages` - Direct messages
- `notifications` - User notifications
- `marketplace` - Product listings
- `status_channels` - Status updates
- `sync_spaces` - Live chat rooms
- `sync_space_messages` - Chat messages
- `sync_space_reactions` - Chat reactions
- `sync_space_participants` - Room participants
- `reports` - Content reports

---

## Demo Mode

The app includes demo mode for testing:
- Demo users are pre-seeded
- Data persists in localStorage
- Payment verification is bypassed in demo mode

To reset demo data:
```javascript
localStorage.removeItem('vibehub_demo_session');
location.reload();
```

---

## Troubleshooting

### Clerk not loading
- Make sure your Clerk publishable key is correct
- Check that middleware is properly configured

### Supabase connection errors
- Verify your Supabase URL and anon key
- Check that RLS policies allow access
- Ensure tables were created successfully

### Images not uploading
- Check Cloudinary API keys
- Verify upload preset is configured
- Check CORS settings in Cloudinary

### Payments not working
- Verify Square payment links are valid
- Check that webhook is configured (if using)

---

## Admin Panel

Access the admin panel at `/admin` or click the shield icon in the bottom bar.

Admin features:
- Dashboard with stats
- User management
- Post management
- Channel management
- Reports review
- Platform settings

Default admin: `Yamasseetechnology@gmail.com`

---

## Support

For issues or questions:
- Email: support@vibehub.app

---

## License

MIT License - Feel free to use and modify!
