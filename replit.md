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
  - `LifeChart`: Main chart visualization using lightweight-charts library
  - `ControlPanel`: Right-side panel for state toggles, weights, and actions
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
- Users table with UUID primary key (auto-generated)
- Username and password fields for authentication
- Zod schema validation using drizzle-zod integration

**Storage Strategy:**
- Current implementation uses in-memory Map structure for rapid prototyping
- Architecture supports switching to PostgreSQL by implementing IStorage interface with Drizzle ORM
- Shared TypeScript types between client and server via `@shared/*` path alias

### Authentication and Authorization

**Current State:**
- Basic user schema defined with username/password fields
- No authentication middleware currently implemented
- Storage interface includes user lookup by username and ID
- Session management dependencies installed (connect-pg-simple) but not configured

**Planned Approach:**
- Session-based authentication pattern (connect-pg-simple for PostgreSQL sessions)
- Password hashing (bcrypt/argon2) to be implemented
- Protected route middleware for authenticated endpoints

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
  - **Empty state**: Shows transparent circle with subtle outline, "0" in center, "Нет событий" text
    - Diagram remains visible but unfilled when no events or all impacts are zero
    - State breakdown list hidden when empty
- **Color Scheme**:
  - Mental: Purple (280, 65%, 65%)
  - Physical: Cyan (200, 85%, 55%)
  - Moral: Amber (45, 90%, 60%)
  - Financial: Green (142, 76%, 36%)