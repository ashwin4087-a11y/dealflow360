# DealFlow360

AI-assisted sales deal management and decision-support platform for the All India Hackathon.

## Team

- Yuvan Shankar B — Sales & Deal Management
- Suryanarayanan D — Fulfillment & Billing
- Ashwin Perumal SR — Intelligence & Customer Experience

## Architecture

React frontend → REST API → Node.js/Express backend → Prisma → PostgreSQL

JWT authentication will be used for protected routes.

## Development

Docker is not required. Run the backend locally with Node.js and connect Prisma to a PostgreSQL database.

## Core modules

1. Sales, quotations, discount governance and approvals
2. Warehouse, inventory, backorders and billing
3. Recommendations, deal health, Deal Rescue Engine, What-If Deal Simulator and customer portal

## Repository structure

```text
frontend/
backend/
  src/
    controllers/
    routes/
    services/
    middleware/
    utils/
  prisma/
```
