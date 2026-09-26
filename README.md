# HeyCiti

A local event discovery app that helps users find things to do near them. Browse events by category, view details, and save the ones you're interested in.

**This project is currently in progress.**

## Tech Stack

- **Frontend:** React
- **Backend:** Node.js / Express
- **Database:** PostgreSQL (Supabase)
- **Events API:** Ticketmaster Discovery API
- **Auth:** JWT + bcrypt

## Features (Planned)

- Browse local events by category, keyword, and location
- View event details and link out to purchase tickets
- Save and unsave events to a personal list
- Sign up and log in with email/password or Google OAuth

## API Endpoints

### Health
- `GET /api/health` - Server and database health check

### Events
- `GET /api/events/search` - Search events via Ticketmaster (supports keyword, city, stateCode, classificationName, startDateTime, endDateTime, sort, size, page)
- `GET /api/events/:id` - Get a single event's details by Ticketmaster ID

### Auth
- `POST /api/auth/register` - Create a new account (email + password)
- `POST /api/auth/login` - Log in and receive a JWT token

## Project Structure

```
server/
  src/
    index.js              # Express app entry point
    db.js                  # Supabase Postgres connection pool
    routes/
      api.js               # Health check route
      events.js            # Event search and detail routes
      auth.js              # Registration and login routes
    services/
      ticketmaster.js      # Ticketmaster API integration
    utils/
      validation.js        # Input validation helpers
    middleware/
      auth.js              # JWT authentication middleware
client/                    # React frontend (coming soon)
```

## Getting Started

### Prerequisites

- Node.js
- A Supabase project with the database schema applied
- A Ticketmaster API key ([developer.ticketmaster.com](https://developer.ticketmaster.com))

### Server Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory with:

```
DATABASE_URL=your_supabase_connection_string
TICKETMASTER_API_KEY=your_ticketmaster_key
JWT_SECRET=your_secret_key
```

Start the development server:

```bash
npm run dev
```

## License

This project is part of a college coursework assignment and is not licensed for redistribution.
