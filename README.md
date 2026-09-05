# DealFlow360

## AI-Powered B2B Sales Operations Platform

DealFlow360 is an intelligent B2B sales operations platform designed to manage the complete journey from quotation to fulfillment and billing.

The system connects sales, approvals, inventory, fulfillment, billing, customer negotiation, and deal intelligence into one workflow.

## Problem We Solve

B2B sales often involve multiple disconnected activities:

- Creating quotations
- Managing discounts
- Getting approval for excessive discounts
- Recommending additional products
- Checking inventory
- Splitting fulfillment across warehouses
- Handling backorders
- Managing one-time and recurring billing
- Negotiating quotations with customers
- Monitoring whether deals are at risk

DealFlow360 brings these processes together in a single system.

## Complete Workflow

Customer
→ Salesperson
→ Quotation
→ Pricing & Discount Check
→ Approval
→ Customer Negotiation / Acceptance
→ Order
→ Warehouse & Inventory
→ Fulfillment / Backorder
→ Billing
→ Invoice & Payment
→ Deal Health Monitoring
→ Deal Rescue

## Main Modules

### 1. Core Sales & Deal Management

**Owner:** Yuvan Shankar B

Responsible for the beginning of the sales workflow.

Features:
- User authentication
- Role-based access
- Customer management
- Product management
- Pricing
- Quotation creation
- Quotation items
- Discount governance
- Discount risk evaluation
- Approval workflow
- Order creation

Flow:
Customer → Product Selection → Quotation → Discount Validation → Approval → Customer Acceptance → Order

### 2. Fulfillment & Billing

**Owner:** Suryanarayanan D

Responsible for processing an approved order.

Features:
- Warehouse management
- Inventory tracking
- Multi-warehouse fulfillment
- Warehouse allocation
- Partial fulfillment
- Backorder management
- One-time billing
- Recurring subscriptions
- Subscription modification
- Subscription cancellation
- Proration
- Invoice generation
- Payment tracking

Flow:
Order → Inventory Check → Warehouse Allocation → Fulfillment → Backorder if Required → Billing → Invoice → Payment

### 3. Intelligence & Customer Experience

**Owner:** Ashwin Perumal SR

Responsible for intelligent recommendations, deal monitoring and customer interaction.

Features:
- Upsell recommendations
- Cross-sell recommendations
- Deal Health Monitoring
- Deal Rescue Engine
- What-If Deal Simulator
- Customer quotation portal
- Customer negotiation
- Counter-offers

Flow:
Quotation / Order Data → Intelligence Layer → Recommendations → Deal Health → Rescue Suggestions → Customer Interaction

## Standout Features

### Deal Health Monitoring

Determines whether a deal is healthy or at risk.

It can consider signals such as:
- Discount level
- Margin
- Deal inactivity
- Negotiation activity
- Fulfillment issues
- Delivery risks

Example:

HIGH RISK

Reasons:
- High discount
- Low margin
- Customer inactive for several days

### Deal Rescue Engine

Deal Health answers:

> "Is this deal at risk?"

Deal Rescue answers:

> "What should the salesperson do about it?"

Example:

A deal has a high discount and low margin.

The system can suggest:
- Reduce discount
- Offer another incentive
- Add a complementary product
- Adjust commercial terms
- Contact the customer

### What-If Deal Simulator

Allows the salesperson to test changes before modifying the real quotation.

Example:

Current:
- Discount: 10%
- Margin: 18%
- Approval: Not Required

What-If:
- Discount: 15%
- Margin: 13%
- Approval: Required

The scenario is temporary until the salesperson chooses to apply it.

## AI Usage

AI is used as an intelligence layer rather than replacing core business logic.

AI can assist with:
- Upsell recommendations
- Cross-sell recommendations
- Deal explanations
- Deal rescue suggestions
- Negotiation insights
- Natural-language summaries

Core business logic remains deterministic:
- Pricing
- Discount validation
- Approval routing
- Inventory calculations
- Warehouse allocation
- Backorder calculations
- Billing
- Proration

## Technology Stack

### Frontend
React

### Backend
Node.js
Express.js
JavaScript

### Database
PostgreSQL

### ORM
Prisma

### API
REST API

### Authentication
JWT

### Development
Docker is not required.

## Architecture

React Frontend
↓
REST API
↓
Node.js + Express.js
↓
Prisma ORM
↓
PostgreSQL

All three modules use the same backend and database.

There are NOT three separate backends.

## Shared Backend Principle

The three members work on different modules but share:
- One backend
- One PostgreSQL database
- One Prisma schema
- One authentication system
- Shared business logic
- Shared entities

Important shared entities include:
- User
- Customer
- Product
- Quotation
- Quotation Item
- Order

Modules must reuse existing entities instead of creating duplicate versions.

## Integration

### Sales → Fulfillment

Approved Quotation
→ Order
→ Fulfillment & Billing

### Sales → Intelligence

Quotation
→ Deal Health
→ Recommendations
→ Deal Rescue
→ Simulation

### Fulfillment → Intelligence

Inventory
→ Fulfillment Status
→ Backorders
→ Delivery Information
→ Deal Health

## Development Rules

1. Do not create separate backends.
2. Do not create separate databases.
3. Do not duplicate shared entities.
4. Do not duplicate business logic.
5. Inspect the existing Prisma schema before modifying it.
6. Keep important business logic in the backend.
7. Frontend should communicate through REST APIs.
8. Use the existing JWT authentication system.
9. Do not use Docker.
10. Follow the existing repository structure.
11. Do not create unnecessary technologies or frameworks.
12. Test each module with the shared backend before integration.

## Team

### Member 1
Yuvan Shankar B — Core Sales & Deal Management

### Member 2
Suryanarayanan D — Fulfillment & Billing

### Member 3
Ashwin Perumal SR — Intelligence & Customer Experience

## Goal

Build a complete, integrated B2B sales workflow that helps sales teams:

- Create better quotations
- Control discounting
- Get approvals efficiently
- Improve sales opportunities
- Handle real inventory constraints
- Manage fulfillment and billing
- Negotiate with customers
- Identify risky deals
- Take actions to rescue deals

The goal is not just to create a quotation system, but to connect the complete sales journey into one intelligent platform.
