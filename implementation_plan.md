# Vibehub Implementation Plan

## 1. Architecture & Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Modern features like Grid, Flexbox, Container Queries, CSS Variables), JavaScript (ES6+ Modules).
- **Service Layer**: Decoupled service classes for Auth, Database, Storage, and Realtime. Prepared for Supabase JS SDK.
- **State Management**: Simple reactive store pattern in `app.js`.
- **UI Components**: Component-based rendering using template literals.

## 2. Visual Design System
- **Colors**: 
  - Primary: Futuristic Purple (`#8b5cf6`) and Neon Orange (`#f97316`).
  - Background: Deep Space Black (`#050505`) with Glassmorphism overlays.
  - Accents: Cyan (`#06b6d4`), Pink (`#ec4899`), and Gold (`#fbbf24`).
- **Typography**: Syne (Headers), DM Sans (Body), Space Mono (UI/Metadata).
- **Animations**: Framer-motion inspired CSS transitions, floating particles, and interactive hover states.

## 3. Core Modules
- **Timeline**: 4-tab system (All, Friends, Trending, We Vibin) with engagement-based ranking algorithm (placeholder).
- **VibeStream**: Vertical video player with overlay engagement controls.
- **Sync Rooms**: Real-time chat interface (simulated with intervals for now).
- **Messaging**: Threaded DM system with reaction support.
- **Profile**: Customizable layout with "Top 8 Vibes" and reaction-based badges.
- **Admin**: Hidden entry point, stats dashboard, and Ad Poster tool.

## 4. Supabase Integration Strategy
- Service methods currently return mock data but are structured as `async` functions.
- Comments indicate exactly where `supabase.from('posts').select(*)` and similar calls go.
- Schema mapping provided for easy table creation in Supabase.

## 5. Square Integration
- Donation buttons prepared for Square Checkout URLs.
- Placeholder service for handling donation state.

## 6. Media Picker Reliability
- **Problem**: Label-wrapped file inputs can fail to trigger on some mobile browsers.
- **Fix**: Use explicit `button` or `div` elements with `onclick` triggers.

## 7. Unified Auth Session Handling
- **Problem**: The app sits idle after a successful Supabase fallback signup/login because the navigation event is only triggered by `handleClerkSession`.
- **Fix**: 
  - Refactor `handleClerkSession` to `syncUserSession` which accepts an optional user object.
  - Ensure `clerk_id` is handled as optional in the `users` table upsert.
  - Ensure `user-logged-in` event is always dispatched regardless of the auth provider.

## 8. Social UX Polish & Premium Enhancements
- **Goal**: Achieve Instagram/Facebook level polish while retaining VibeHub's unique futuristic glow.
- **Enhancements**:
  - **Gestures**: Implement `dblclick` (double-tap) on post media to trigger a "Heat" reaction with a center-screen animation.
  - **Reaction System**: Group secondary reactions into a "+" or "Vibe" picker to declutter the post actions.
  - **Navigation**: Update bottom nav to show 5 icons (Home, Stream, Center-Post, Notifs, Profile) for easier access to core loops.
## 9. Pull-to-Refresh (PTR) & Reaction Fixes
- **Reaction Double-Count**:
  - **Problem**: Conflict between inline `onclick` and delegated global click listener in `app.js`.
  - **Fix**: Remove the delegated listener in `setupEventListeners` and consolidate animation/Supabase logic within `handleReaction`.
- **PTR Trigger Sensitivity**:
  - **Problem**: Drag effect activates too easily while scrolling up towards the top.
  - **Fix**: 
    - Enforce a strict `scrollY === 0` check.
    - Simplified trigger: only allow `isPulling` if the user is already at the top and the touch movement is clearly downward (+deltaY).
    - Add `overscroll-behavior-y: none` to `body` in `styles.css`.
