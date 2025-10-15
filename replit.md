# Soulgraph - Life Tracking Application

## Overview

Soulgraph is an interactive life tracking web application that visualizes life metrics through a trading platform-inspired interface. The application uses interactive charts similar to Bybit/TradingView to display an aggregated "life index" based on four core states: Mental (Душевное), Physical (Физическое), Moral (Моральное), and Financial (Финансовое). Users can add positive or negative life events as news markers on the chart, which dynamically affect the visualized metrics with smooth animations and real-time updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools:**
- React with TypeScript running on Vite for fast development and optimized production builds
- Wouter for lightweight client-side routing
- Single-page application architecture with the main dashboard at root path

**Component Structure:**
- Component-based architecture using React functional components with hooks
- Reusable UI components built on Radix UI primitives (located in `client/src/components/ui/`)
- shadcn/ui design system with "new-york" style variant configured in `components.json`
- Custom components for application features:
  - `LifeChart`: Main chart visualization using lightweight-charts library with custom token name display
  - `ControlPanel`: Right-side panel with sections in order - token display, chart type toggle, event buttons (Позитив/Негатив), state indicators, daily balance, and daily norm progress
  - `TokenNameEditor`: Modal dialog for editing custom token name (authenticated users only)
  - `NewsModal`: Modal dialog for adding positive/negative life events
  - `NewsPopup`: Popup displaying event details when clicking chart markers
  - `ChartTooltip`: Hover tooltip showing event details on chart crosshair
  - `DailyBalance`: Circular diagram displaying 24-hour impact aggregation

**State Management:**
- React hooks (useState, useMemo, useEffect) for local component state
- TanStack Query (React Query) for server state management and caching
- No global state management library - state lifted to Dashboard component as needed

**Styling Approach:**
- Tailwind CSS with custom configuration for dark mode trading platform aesthetic
- CSS variables for theming with HSL color values
- Dark mode as default with professional trading platform color palette
- Custom design tokens defined in `design_guidelines.md`:
  - Background layers: Primary (17 12% 8%), Secondary (17 12% 12%), Elevated (17 12% 16%)
  - Semantic colors: Positive/Green (142 76% 36%), Negative/Red (0 84% 60%)
  - State-specific colors: Mental/Purple, Physical/Cyan, Moral/Amber, Financial/Green

**Data Visualization:**
- lightweight-charts library for candlestick and line chart rendering
- Support for both candlestick and line chart types with toggle
- Interactive features: zoom, scroll, hover tooltips, time-series annotations
- Custom markers for news events with color-coded indicators
- Multiple time series overlay for four life states
- Fixed equal weights (0.25 each) for all states in aggregate calculation
- Daily norm progress bars instead of adjustable weight sliders
- **Custom token name**: Users can set their own token name (default "SOUL") which replaces "Общие активы" in chart legend and control panel
- Token name editable via pencil icon in control panel (authenticated users only)

### Backend Architecture

**Server Framework:**
- Node.js with Express.js for REST API
- TypeScript for type safety across full stack
- Modular route registration pattern in `server/routes.ts`
- Custom error handling middleware

**Development Environment:**
- Vite middleware integration in development mode for HMR
- Custom logging middleware for API request/response tracking
- Static file serving in production mode
- Request size limit: 50MB for JSON and URL-encoded payloads (supports large media uploads)

**API Design:**
- RESTful API pattern with `/api` prefix for all endpoints
- JSON request/response format
- Routes registered through `registerRoutes` function
- HTTP server created and returned for WebSocket support potential

**Storage Layer:**
- Interface-based storage abstraction (`IStorage` interface)
- In-memory storage implementation (`MemStorage`) for prototype/development
- Designed for easy swap to persistent storage (PostgreSQL via Drizzle ORM configured)
- CRUD operations for user management in current schema

### Data Storage Solutions

**Database Configuration:**
- Drizzle ORM configured for PostgreSQL dialect
- Schema defined in `shared/schema.ts` using Drizzle's pgTable
- Migration files output to `./migrations` directory
- Database URL from environment variable `DATABASE_URL`

**Current Schema:**
- **Users table**: UUID primary key, walletAddress (Solana address), tokenName (custom token display name, default "SOUL"), createdAt timestamp
- **News events table**: Stores life events with media attachments (images/video as data URLs in JSONB)
  - Fields: id, time, type, text, impact values (mental, physical, moral, financial), media array, createdAt
- **State data table**: Stores time-series state values for chart visualization
  - Fields: id, time, mental, physical, moral, financial values, createdAt
- Zod schema validation using drizzle-zod integration

**Storage Strategy:**
- Current implementation uses in-memory Map structure for rapid prototyping
- News events and state data persisted in memory with API endpoints
- Media files stored as data URLs (base64) in JSONB column
- Architecture supports switching to PostgreSQL by implementing IStorage interface with Drizzle ORM
- Shared TypeScript types between client and server via `@shared/*` path alias

**API Endpoints:**
- `GET /api/news-events` - Retrieve all news events with media
- `POST /api/news-events` - Create new event with media attachments
- `GET /api/state-data` - Retrieve all state data points
- `POST /api/state-data` - Create new state data point
- `PATCH /api/auth/token-name` - Update user's custom token name (requires authentication)

### Authentication and Authorization

**Current Implementation:**
- **Wallet-based authentication** using Phantom (Solana wallet)
- User schema stores Solana wallet addresses (walletAddress field)
- Session-based authentication using express-session
- No passwords - authentication via cryptographic signature verification

**Authentication Flow:**
1. User clicks "Connect Wallet" button in header
2. Frontend requests nonce from server (`POST /api/auth/nonce`)
3. User signs message with Phantom wallet containing nonce
4. Frontend sends signature to server (`POST /api/auth/verify`)
5. Server verifies signature using @solana/web3.js and tweetnacl
6. Server creates or finds user by wallet address
7. Server creates session with userId and walletAddress
8. User is authenticated and can access protected features

**API Endpoints:**
- `POST /api/auth/nonce` - Generate nonce for wallet signature
- `POST /api/auth/verify` - Verify signature and create session
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Destroy session and logout
- `PATCH /api/auth/token-name` - Update custom token name (max 20 characters)

**Frontend Components:**
- `ConnectWallet` - Button to connect/disconnect Phantom wallet
- `useAuth` hook - React hook for authentication state management
- Session persists for 7 days with httpOnly cookies

**Security:**
- Nonces expire after 5 minutes and can only be used once
- Signatures verified using Ed25519 cryptography
- Sessions use SESSION_SECRET environment variable
- HTTPS-only cookies in production

## External Dependencies

**Chart Visualization:**
- lightweight-charts: Professional-grade charting library for candlestick/line charts with trading platform UX

**UI Component Libraries:**
- @radix-ui/*: Comprehensive set of unstyled, accessible UI primitives
- shadcn/ui: Pre-built component patterns on top of Radix UI
- cmdk: Command palette component
- embla-carousel-react: Carousel/slider functionality
- lucide-react: Icon library

**Form & Validation:**
- react-hook-form: Form state management
- @hookform/resolvers: Validation resolver integration
- zod: Runtime type validation and schema definition
- drizzle-zod: Bridge between Drizzle ORM and Zod schemas

**Styling:**
- tailwindcss: Utility-first CSS framework
- class-variance-authority: Type-safe variant styling
- clsx & tailwind-merge: Conditional class composition

**Data Fetching:**
- @tanstack/react-query: Server state management, caching, and synchronization
- Fetch API for HTTP requests with custom wrapper in `lib/queryClient.ts`

**Database & ORM:**
- drizzle-orm: TypeScript ORM for SQL databases
- @neondatabase/serverless: Serverless PostgreSQL driver
- drizzle-kit: Migration and schema management CLI

**Date & Time:**
- date-fns: Modern JavaScript date utility library

**Development Tools:**
- Vite plugins from Replit for runtime error overlay, cartographer, and dev banner
- TypeScript for full-stack type safety
- ESBuild for production server bundling

**Fonts:**
- Google Fonts: Inter (primary UI font) and Roboto Mono (monospace for data)
- Loaded via HTML link tags with preconnect optimization

**Data Visualization:**
- recharts: Composable charting library for React (used in DailyBalance circular diagram)

## Key Features

### Media Persistence
- **Photo and video attachments**: Events support uploading images and videos (max 10MB per file)
- **Data URL storage**: Media files converted to base64 data URLs and stored in database
- **Persistent storage**: All events with media saved to server via API
- **Auto-reload**: Events and media automatically loaded from server on page refresh
- **Display in UI**: Media previews shown in event popups, tooltips, and modal dialogs

### Clickable Candlesticks
- **Click on candlestick**: Opens popup showing all events from that day
- **Click on event marker**: Opens popup showing that specific event
- **Implementation**: Uses lightweight-charts `subscribeClick` API
- **Date matching**: Groups events by calendar date (ignores time of day)
- **Popup displays**: Multiple events in scrollable list with individual timestamps, including media previews

### Chart Tooltip System
- Hover-activated tooltips display event details directly on chart
- Triggered by lightweight-charts crosshair movement
- Shows event text, media preview, and impact values
- Auto-positioning relative to cursor with offset
- Semi-transparent card design with backdrop blur

### Daily Balance Visualization
- **Component**: `DailyBalance` - Circular diagram showing 24-hour impact aggregation
- **Location**: Control panel, between indicators and weight sliders
- **Functionality**:
  - Filters all news events from last 24 hours
  - Calculates signed totals for each life state (Mental, Physical, Moral, Financial)
  - Displays donut chart with state-colored segments (using recharts PieChart)
  - Shows net balance in center with appropriate color coding:
    - Positive balance: Green text with "+" prefix
    - Negative balance: Red text with "-" sign
    - Zero balance: Neutral display
- **Data Presentation**:
  - Pie segments use absolute values for visualization (chart requirement)
  - State breakdown and total use signed values for accuracy
  - Event count with Russian pluralization
  - Interactive tooltip on hover showing signed impact values
  - **Empty state**: Shows colored segments (Mental/Physical/Moral/Financial) with 30% opacity, "0" in center, "Нет событий" text
    - Diagram remains visible with colored outline when no events or all impacts are zero
    - State breakdown list hidden when empty
- **Color Scheme**:
  - Mental: Purple (280, 65%, 65%)
  - Physical: Cyan (200, 85%, 55%)
  - Moral: Amber (45, 90%, 60%)
  - Financial: Green (142, 76%, 36%)