# GiftAI - AI-Powered Gift Discovery Platform

## Overview

GiftAI is an AI-powered gift recommendation platform that helps users find personalized gifts based on recipient profiles, interests, and occasions. The application uses OpenAI's GPT to analyze recipient characteristics and match them with a curated database of gift products, providing thoughtful recommendations with personalized explanations and messages.

## User Preferences

Preferred communication style: Simple, everyday laguage.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety and component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching
- Tailwind CSS for utility-first styling with custom design tokens

**UI Component System:**
- Shadcn/ui component library based on Radix UI primitives
- Custom design system with brand colors (deep purple-blue primary, warm coral accents)
- Responsive design with mobile-first approach
- Theme toggle support for light/dark modes

**Key Design Decisions:**
- **Component Organization**: Separation of concerns with dedicated folders for UI components, pages, and examples
- **State Management**: React Query handles server state while local component state manages UI interactions
- **Routing Strategy**: Simple route structure with home page and dynamic results page based on session ID
- **Form Handling**: React Hook Form with Zod validation for type-safe form processing

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js for the REST API server
- TypeScript for end-to-end type safety
- Drizzle ORM for database operations (configured for PostgreSQL)
- In-memory storage implementation (MemStorage) as fallback/development option

**API Design:**
- RESTful endpoints for gift recommendations and wishlist management
- Session-based user tracking (no authentication required for MVP)
- JSON request/response format with Zod schema validation

**Key Architectural Patterns:**
- **Storage Abstraction**: IStorage interface allows switching between in-memory and database implementations
- **Request Validation**: Zod schemas ensure type-safe API contracts between client and server
- **AI Service Layer**: Dedicated service for OpenAI integration, separate from route handlers
- **Seeding Strategy**: Database seeding on startup to populate curated gift products

**AI Integration Design:**
- Google Gemini API integration for intelligent gift suggestion generation and personalized message generation
- **AI-First Product Discovery**: AI generates 5-8 product ideas based on recipient profile, then searches Amazon for real products
- **Unlimited Product Variety**: No longer limited to curated database - AI dynamically suggests products for any recipient
- Custom prompts designed for personality-based gift recommendations with reasoning
- Fallback to rule-based product suggestions when AI unavailable

### Data Models

**Core Entities:**
- **Gift Products**: Curated catalog with categorization by interests, occasions, price ranges, personality types
- **Gift Recommendations**: AI-generated suggestions linking users to products with reasoning
- **Wishlist Items**: Saved recommendations with optional notes and reminders

**Database Schema Approach:**
- PostgreSQL with Drizzle ORM for production
- Schema-first design with type generation from Drizzle schemas
- Array fields for multi-value attributes (interests, tags, occasions)
- UUID primary keys for all entities

**Data Flow:**
1. User submits recipient profile through form
2. Backend filters products by budget and basic criteria
3. AI service calculates relevance scores for filtered products
4. Top recommendations returned with personalized reasoning
5. Users can save to wishlist and request personalized messages

### External Dependencies

**AI Services:**
- **Google Gemini API**: Gemini 2.5 Flash model for gift recommendation reasoning and personalized message generation
- API key required via environment variable `GEMINI_API_KEY`
- Implemented with timeout handling and rule-based fallback for reliability

**Database:**
- **PostgreSQL** (via Neon serverless): Primary production database
- **Drizzle ORM**: Type-safe database client and schema management
- Connection via `DATABASE_URL` environment variable
- Migrations stored in `/migrations` directory

**Third-Party UI Libraries:**
- **Radix UI**: Headless component primitives for accessibility
- **Shadcn/ui**: Pre-built component library built on Radix
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel/slider functionality
- **Vaul**: Drawer component library

**Development Tools:**
- **Vite**: Frontend build tool with HMR support
- **Replit-specific plugins**: Runtime error overlay, cartographer, dev banner
- **ESBuild**: Backend bundling for production builds

**E-Commerce Integration:**
- **RapidAPI - Real-Time Amazon Data API**: Provides access to live Amazon product catalog
- API key required via environment variable `RAPIDAPI_KEY`
- Features: Product search, pricing, star ratings, Prime badges, reviews, product URLs for direct purchasing
- Powers unlimited AI-generated product recommendations with real Amazon products

**Future Integration Points:**
- Email notification service for reminders (planned)
- Additional marketplace integrations (Walmart, Target, etc.)

### Authentication & Session Management

**Authentication:**
- **Replit Auth integration**: Full user authentication with PostgreSQL session storage
- Supports both authenticated users and anonymous sessions
- Authenticated users get persistent "bucket list" across sessions
- Anonymous users use session-based wishlists (temporary)

**Session Management:**
- Session IDs generated client-side using `nanoid`
- Sessions group recommendations and wishlist items per search
- Dual storage: userId for authenticated, sessionId for anonymous
- Backend validates presence of either userId or sessionId for wishlist operations

### Content Strategy

**Gift Product Database:**
- **Dynamic AI-Generated Products**: AI generates unlimited product ideas based on recipient profile
- Amazon product search provides real products with images, ratings, and buy links
- Products automatically stored in database for persistence and wishlist functionality
- Amazon products marked with category "Amazon Product" and include Prime/Best Seller badges
- **Amazon Integration**: Amazon products enriched with real-time data
  - Schema temporarily stores Amazon URLs in `flipkartUrl` field
  - Products include: images, prices, star ratings, Prime badges, Amazon's Choice badges
  - Direct "Buy on Amazon" links to product pages

## Recent Changes (October 2025)

### Amazon E-Commerce Integration (Latest)
- **Migrated from curated database to unlimited AI-generated products**
- Integrated RapidAPI Real-Time Amazon Data API for live Amazon product search
- Created `server/amazon-service.ts` with product search functionality
- Updated `server/ai-service.ts` to generate product suggestions (not just rank existing products)
- Modified `/api/recommendations` endpoint to use AI + Amazon search instead of curated database
- Amazon products stored as gift_product records with category "Amazon Product"
- Enhanced UI to display Amazon products with images, star ratings, Prime badges, and buy links

### Key Features
1. **AI Product Generation**: Gemini AI analyzes recipient profile and generates 5-8 personalized product ideas
2. **Amazon Product Search**: Real-time search of Amazon catalog for each AI-generated idea
3. **Unlimited Variety**: No longer limited to 203 curated products - can recommend anything on Amazon
4. **Rich Product Data**: Images, prices, star ratings, review counts, Prime badges, Best Seller tags
5. **Seamless Purchase Flow**: Direct "Buy on Amazon" links to product pages
6. **Fallback System**: Rule-based product suggestions when Gemini API unavailable

### Architecture Changes
- **POST /api/recommendations**: Now generates AI product ideas → searches Amazon → stores results
- **GET /api/recommendations/:sessionId**: Enriches Amazon products with badges and pricing data
- **Database Storage**: Amazon products stored as gift_product records for persistence
- **AI Workflow**: Gemini generates product ideas based on interests, personality, and occasion
- **Fallback Strategy**: Interest-to-search-query mapping ensures system works without AI

### How It Works
1. User submits recipient profile (interests, personality, budget, occasion)
2. Gemini AI analyzes profile and generates 5-8 product suggestions with reasoning
3. Each suggestion is searched on Amazon to find real products
4. Top-rated products with matching budgets are returned
5. Products stored in database and displayed with images, ratings, and buy links
6. Users can save to wishlist and request personalized gift messages