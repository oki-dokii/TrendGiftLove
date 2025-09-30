# GiftAI - AI-Powered Gift Discovery Platform

## Overview

GiftAI is an AI-powered gift recommendation platform that helps users find personalized gifts based on recipient profiles, interests, and occasions. The application uses OpenAI's GPT to analyze recipient characteristics and match them with a curated database of gift products, providing thoughtful recommendations with personalized explanations and messages.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- OpenAI GPT integration for intelligent gift matching and personalized message generation
- Two-phase recommendation process: pre-filtering by budget/criteria, then AI relevance scoring
- Custom prompts designed for personality-based gift recommendations
- Relevance scoring algorithm (1-100) to rank gift suggestions

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
- **OpenAI API**: GPT model for gift recommendation reasoning and personalized message generation
- API key required via environment variable `OPENAI_API_KEY`

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

**Future Integration Points:**
- Affiliate product APIs (planned, not yet implemented)
- Email notification service for reminders (planned)
- Product image hosting/CDN service

### Session Management

**Approach:**
- Session-based tracking without user authentication (anonymous users)
- Session IDs generated client-side using `nanoid`
- Sessions group recommendations and wishlist items per search
- No persistent user accounts in MVP

### Content Strategy

**Gift Product Database:**
- Curated seed data with 200+ products across categories
- Manual curation ensures quality over quantity
- Products tagged by: interests, occasions, age groups, personality types, relationships
- Price ranges from ₹0 (DIY ideas) to ₹10,000+
- Categories include: Technology, Books, Art, Sports, Fashion, Home, etc.