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
-   **Data Visualization**: `lightweight-charts` for interactive candlestick and line charts, supporting custom markers for news events and multiple time series overlays. Custom token name display is supported. Custom SVG rendering for the Daily Balance human figure visualization.
-   **Core Components**: `LifeChart`, `ControlPanel`, `TokenNameEditor`, `NewsModal`, `NewsPopup`, `ChartTooltip`, `HumanBalance`.

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
-   **Daily Balance Visualization**: An anatomical muscle model image (`HumanBalance`) in the control panel that aggregates the signed impact of all news events from the last 24 hours. Uses real muscle anatomy image (anatomy_muscles.png, 220×400px) with 4 colored overlay layers via CSS clip-path polygons. Body regions (head=Mental 0-18% height, chest=Moral 18-42%, torso=Physical 42-62%, legs=Financial 62-100%) fill with state-specific colors (purple/yellow/cyan/green) where opacity indicates magnitude and red borders mark negative balances. Positive values use opacity 0.15-0.6, while negative values are dimmer (0.15-0.4) for clear visual distinction.
-   **Clear All Events**: Destructive action with confirmation dialog that deletes all user events and resets graph to baseline (0 for all states). Includes event count display and cancellation option.

## Recent Fixes & Technical Details

### Mobile Version Implementation (November 2025)
-   **iOS Touch Targets**: All interactive buttons enforce minimum 44px height (`min-h-[44px]`) to comply with Apple Human Interface Guidelines
-   **Responsive Layout**: Dashboard switches from vertical stack (mobile) to horizontal layout (desktop ≥lg breakpoint)
-   **ControlPanel Adaptation**: Full-width (`w-full`) on mobile with max-height 50vh, fixed 320px (`w-80`) on desktop; timeframe buttons in 4-column grid on mobile (2-column on desktop)
-   **NewsModal Optimization**: Near-fullscreen (95vw width) on mobile with compact spacing and proper touch target sizing
-   **HumanBalance Visibility**: Hidden on mobile/tablet (`hidden lg:block`) to save screen space, visible only on desktop
-   **PWA Meta Tags**: Added viewport-fit=cover for iPhone notch, apple-mobile-web-app-capable, status-bar-style, theme-color for native app experience
-   **Viewport Settings**: width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes for accessibility
-   **Critical Performance Fix**: Removed duplicate `setMarkersReady` call from data update useEffect to prevent infinite render loops
-   **Mobile Testing**: E2E tests verify responsive layout, news creation, timeframe switching on iPhone 14 Pro viewport (393x852)

### Anatomical Model Implementation (November 2025)
-   **Real Anatomy Image**: Replaced programmatic SVG with real muscle anatomy photograph (anatomy_muscles.png, 220×400px)
-   **CSS Clip-Path Overlays**: Implemented 4 colored overlay layers using polygon clip-paths to highlight body regions
-   **Region Mapping**: Head (0-18% height)=Mental, Chest (18-42%)=Moral, Torso (42-62%)=Physical, Legs (62-100%)=Financial
-   **Opacity System**: Positive values 0.15→0.6 opacity (visible), negative values 0.15→0.4 opacity (dimmer) for visual distinction
-   **Negative Indicators**: Red border on negative balance regions instead of changing base colors
-   **Image Optimization**: Renamed from Cyrillic filename to anatomy_muscles.png for better Vite compatibility
-   **Performance**: Lightweight CSS overlays blend seamlessly with base image without rendering issues

### Exchange-Style Timeframe System (November 2025)
-   **Timeframe Options**: Implemented 1D, 7D, 30D, 90D buttons matching Bybit/Binance UX with monospace font
-   **aggregateCandles Function**: Created in `dateUtils.ts` to group daily StateData into period candles with OHLC values, preserving individual state closes (mental, physical, moral, financial)
-   **Intentional Design Choice**: Candlestick mode **restricted to 1D only**; aggregated timeframes (7D/30D/90D) auto-switch to line mode because StateData stores cumulative closes (not intraday OHLC), making aggregated candlesticks visually flat with no meaningful high/low variation
-   **Period Bucketing**: Candles group by calendar days (7/30/90 consecutive days), using dateEnd for time alignment with closing values
-   **State Preservation**: Each aggregated candle preserves per-state close values for accurate overlay display in line mode
-   **UI Updates**: ControlPanel shows 4 monospace buttons (1D/7D/30D/90D) in 2x2 grid with active state highlighting, maintaining 44px iOS touch targets
-   **Chart Auto-Switching**: Dashboard computes `effectiveChartType` to ensure line mode displays for aggregated timeframes regardless of user's candlestick preference
-   **Async Query Flow**: TanStack Query refetch after news event creation requires 3-5 seconds for stateData rebuild and currentValues update
-   **Standard Practice**: Matches major exchanges (Bybit, Binance) which use lines for multi-day periods and reserve candlesticks for native intraday resolutions
-   **Performance**: No infinite loops; removed duplicate setMarkersReady calls, stable refs for chart event handlers
-   **Date Utilities**: `timeframeToDays()` maps Timeframe to day counts, `aggregateCandles()` computes OHLC with per-state granularity

### Event Display System (October 2025)
-   **Baseline Timing Fix**: Baseline point now created 1 second BEFORE first event (previously used `Date.now()` which appeared after historical events, causing false red candlesticks)
-   **Event Loading Fix**: Changed useEffect dependency from `newsEvents.length` to `newsEvents` array to ensure events display immediately on page load
-   **NewsModal Form Reset**: Added useEffect to reset form state (text, impact sliders, media) when modal opens, preventing stale data between uses
-   **Impact Values**: Slider ranges -20 to +20 per state, with proper state management to ensure values persist to database
-   **Chart Display Fix**: Hidden individual state lines by default (mental, physical, moral, financial all set to `false`), showing only aggregate candlestick/line chart for clean visualization
-   **Candlestick Logic Simplification**: Replaced complex volatility-based calculation with simple open/close logic where `open = previous aggregate value` and `close = current aggregate value`
-   **Negative Values Support**: Changed value range from 0-100 to -1000 to +1000, allowing negative states to display correctly on chart with red candlesticks
-   **NewsModal State Persistence**: Removed 'type' dependency from useEffect to prevent form reset while modal is open, ensuring slider values persist during user interaction

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