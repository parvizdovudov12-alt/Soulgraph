# Soulgraph - Life Tracking Application

## Overview

Soulgraph is a multi-user interactive web application designed to visualize personal life metrics through a trading platform-inspired interface. Each registered user receives a unique graph displaying an aggregated "life index" derived from four core states: Mental, Physical, Moral, and Financial. Users can log positive or negative life events as news markers on their charts, which dynamically update metrics with smooth animations and real-time feedback. The project aims to provide a comprehensive and engaging way for individuals to track and understand their life's progression, offering insights into their well-being across different dimensions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

-   **Framework**: React with TypeScript on Vite.
-   **Routing**: Wouter for client-side routing.
-   **UI Components**: Radix UI primitives and shadcn/ui ("new-york" style) for a consistent design system.
-   **Styling**: Tailwind CSS configured for a dark mode, trading platform aesthetic, using HSL color values and custom design tokens for backgrounds and semantic/state-specific colors.
-   **State Management**: React hooks for local state; TanStack Query for server state management and caching.
-   **Data Visualization**: `lightweight-charts` for interactive candlestick and line charts, supporting custom markers for news events and multiple time series overlays. Custom token name display is supported. `recharts` is used for the Daily Balance circular diagram.
-   **Core Components**: `LifeChart`, `ControlPanel`, `TokenNameEditor`, `NewsModal`, `NewsPopup`, `ChartTooltip`, `DailyBalance`.

### Backend

-   **Framework**: Node.js with Express.js and TypeScript.
-   **API Design**: RESTful API with JSON request/response format, `/api` prefix, and modular route registration.
-   **Storage Layer**: Interface-based abstraction (`IStorage`) with `MemStorage` for development and `PostgresStorage` using Drizzle ORM for production.
-   **Authentication**: Dual system supporting email/password and Phantom wallet (Solana) login, using `express-session` for session management and `bcryptjs` for password hashing. Nonce-based authentication for wallet connections with `tweetnacl` and `@solana/web3.js` for signature verification.
-   **Security**: Password hashing, nonce expiration, Ed25519 signature verification, HTTPS-only httpOnly session cookies, and data isolation ensuring users only access their own data.

### Data Storage

-   **Database**: PostgreSQL via Drizzle ORM.
-   **Schema**: Defined in `shared/schema.ts`, including `Users`, `News events`, and `State data` tables.
    -   **Users**: Stores user details, including `tokenName` (customizable) and optional `walletAddress`.
    -   **News events**: Stores user-specific life events with media attachments (images/videos as data URLs in JSONB).
    -   **State data**: Stores time-series values for the four life states.
-   **Validation**: Zod for schema validation integrated with Drizzle.
-   **Deployment**: Neon serverless PostgreSQL for optimal performance.

### Key Features

-   **Media Persistence**: Support for photo/video attachments (up to 10MB) in events, stored as base64 data URLs in the database, with persistent display.
-   **Clickable Candlesticks**: Clicking a candlestick or event marker opens a popup displaying all associated events for that day, including media previews.
-   **Chart Tooltip System**: Interactive tooltips displaying event details (text, media, impact values) on crosshair hover.
-   **Daily Balance Visualization**: A circular diagram (`DailyBalance`) in the control panel that aggregates the signed impact of all news events from the last 24 hours across the four life states, showing net balance and individual state contributions.
-   **Clear All Events**: Destructive action with confirmation dialog that deletes all user events and resets graph to baseline (0 for all states). Includes event count display and cancellation option.

## Recent Fixes & Technical Details

### Event Display System (October 2025)
-   **Baseline Timing Fix**: Baseline point now created 1 second BEFORE first event (previously used `Date.now()` which appeared after historical events, causing false red candlesticks)
-   **Event Loading Fix**: Changed useEffect dependency from `newsEvents.length` to `newsEvents` array to ensure events display immediately on page load
-   **NewsModal Form Reset**: Added useEffect to reset form state (text, impact sliders, media) when modal opens, preventing stale data between uses
-   **Impact Values**: Slider ranges -20 to +20 per state, with proper state management to ensure values persist to database

### Chart Rendering Logic
-   **Candlestick Colors**: Green (bullish) when close > open, Red (bearish) when close < open
-   **Aggregate Calculation**: Weighted average of 4 states with equal weights (0.25 each)
-   **Data Flow**: Events → State Data Points → Chart Series → Visual Candlesticks/Lines
-   **Marker Display**: Line charts use built-in `setMarkers()`, Candlestick charts use custom HTML markers positioned via `timeToCoordinate()` and `priceToCoordinate()`

## External Dependencies

-   **Chart Visualization**: `lightweight-charts`, `recharts`.
-   **UI Components**: `@radix-ui/*`, `shadcn/ui`, `cmdk`, `embla-carousel-react`, `lucide-react`.
-   **Form & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
-   **Styling**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`.
-   **Data Fetching**: `@tanstack/react-query`, Fetch API.
-   **Database & ORM**: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.
-   **Date & Time**: `date-fns`.
-   **Authentication**: `bcryptjs`, `@solana/web3.js`, `tweetnacl`, `express-session`.
-   **Development Tools**: Vite plugins, TypeScript, ESBuild.
-   **Fonts**: Google Fonts (Inter, Roboto Mono).