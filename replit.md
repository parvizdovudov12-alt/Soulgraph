# Soulgraph - Life Tracking Application

## Overview

Soulgraph is a multi-user interactive web application visualizing personal life metrics through a trading platform-inspired interface. Each user receives a unique graph displaying an aggregated "life index" from four core states: Mental, Physical, Moral, and Financial. Users log positive or negative life events as news markers on their charts, dynamically updating metrics with real-time feedback. The project aims to provide an engaging way for individuals to track and understand their life's progression and well-being.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design Principles

-   **UI/UX**: Trading platform aesthetic with dark mode, responsive design for mobile (iOS touch targets, adaptive layouts), and a consistent design system using Radix UI and shadcn/ui. Integration of a custom anatomical muscle model (`HumanBalance`) for daily balance visualization.
-   **Data Visualization**: Interactive candlestick and line charts using `lightweight-charts` with custom markers for events and time series overlays.
-   **Modularity**: Clear separation between frontend and backend, with a RESTful API and an interface-based storage layer.
-   **Security**: Robust authentication (email/password, Solana wallet), password hashing, signature verification, and data isolation.

### Frontend

-   **Framework**: React with TypeScript on Vite.
-   **Routing**: Wouter.
-   **UI**: Radix UI primitives, shadcn/ui ("new-york" style), Tailwind CSS (dark mode, HSL colors, custom tokens).
-   **State Management**: React hooks (local), TanStack Query (server state, caching).
-   **Data Visualization**: `lightweight-charts` for charts, custom SVG rendering for `HumanBalance`.
-   **Key Components**: `LifeChart`, `ControlPanel`, `TokenNameEditor`, `NewsModal`, `HumanBalance`.
-   **Features**: User avatar upload (base64, 2MB limit, full-width display up to 280px with vertical layout using AspectRatio for 1:1 square format, hover overlay with camera icon), media persistence in events (base64, 10MB limit), clickable candlesticks/event markers with popups, interactive chart tooltips, and a "Clear All Events" feature with confirmation.
-   **Timeframe System**: Exchange-style 1D, 7D, 30D, 90D timeframes. Candlestick mode restricted to 1D; aggregated timeframes (7D/30D/90D) auto-switch to line mode due to cumulative state data.
-   **Anatomical Model**: `HumanBalance` uses a custom SVG human figure with extensive muscle anatomy and 3D gradient effects. Features include: pectorals (split chest), massive deltoids (3-head shoulders), trapezius (upper back/neck), latissimus dorsi (lats), serratus anterior (ribs), split six-pack abs with center line, obliques, **massive biceps with double peaks** (33% larger), **thick triceps** (50% larger), **detailed forearms** (40% larger with triple tendon lines), **wide quadriceps** (vastus medialis/lateralis, rectus femoris with volume ellipses), **enlarged hamstrings** (67% larger), **huge gastrocnemius calves** (43% larger with double diamond definition), and **thick tibialis anterior shins** (double lines). Dynamic fill regions for Mental (head - purple), Moral (chest/heart - yellow), Physical (torso/core - cyan), and Financial (legs/calves - green) are colored and opacity-adjusted based on daily event impact (positive: base color, negative: red, neutral: 30% opacity). Linear and radial gradients create depth and volume for hyper-realistic bodybuilder appearance with visibly thicker arms and legs.

### Backend

-   **Framework**: Node.js with Express.js and TypeScript.
-   **API**: RESTful, JSON, `/api` prefix, modular routes.
-   **Storage Layer**: `IStorage` interface, `MemStorage` (development), `PostgresStorage` (production) with Drizzle ORM.
-   **Authentication**: Email/password (`bcryptjs`, `express-session`) and Phantom wallet (Solana: `tweetnacl`, `@solana/web3.js` for nonce-based signature verification).
-   **Security**: Password hashing, nonce expiration, Ed25519 signature verification, HTTPS-only httpOnly session cookies, data isolation.

### Data Storage

-   **Database**: PostgreSQL via Drizzle ORM, deployed on Neon serverless.
-   **Schema (`shared/schema.ts`)**:
    -   `Users`: `tokenName`, `avatarUrl` (base64), `walletAddress`.
    -   `News events`: User-specific events, media attachments (base64 data URLs in JSONB).
    -   `State data`: Time-series values for the four life states.
-   **Validation**: Zod for schema validation.

## External Dependencies

-   **Chart Visualization**: `lightweight-charts`.
-   **UI Components**: `@radix-ui/*`, `shadcn/ui`, `cmdk`, `lucide-react`.
-   **Form & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
-   **Styling**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`.
-   **Data Fetching**: `@tanstack/react-query`.
-   **Database & ORM**: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.
-   **Date & Time**: `date-fns`.
-   **Authentication**: `bcryptjs`, `@solana/web3.js`, `tweetnacl`, `express-session`.