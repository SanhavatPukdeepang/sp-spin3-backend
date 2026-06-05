# Project Instructions: sp-spin3-backend

This document contains foundational mandates, architecture patterns, and coding conventions for the `sp-spin3-backend` project.

## Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** WebSockets (`ws` library) and Server-Sent Events (SSE)
- **File Storage:** Cloudinary (via `multer` and `multer-storage-cloudinary`)
- **Security:** Helmet, CORS, JWT authentication, Bcrypt password hashing

## Architecture Patterns

### Modular Structure
The project follows a modular structure located in `src/modules`. Each module should encapsulate its own:
- **Model:** Mongoose schema definition (e.g., `Menu.js`).
- **Controller:** Logic for handling requests and interacting with models (e.g., `menuController.js`).
- **Specialized Logic:** Any module-specific logic (e.g., `inventoryLifecycle.js`).

### Routing
Routes are centralized in `src/routes/index.js` which delegates to specific route files (e.g., `src/routes/menu.js`).
- Use `/api` as the base prefix for all standard routes.
- Legacy/Compatibility routes are under `/api/api`.

### Real-time Communication
- **WebSockets:** Used for broadcasting updates like ingredient stock snapshots and table order status. Initialized in `src/realtime/`.
- **SSE:** Used for lightweight one-way notifications.

## Coding Conventions

### Naming
- **Files:** Use camelCase for controllers and utilities (e.g., `menuController.js`). Use PascalCase for Mongoose models (e.g., `Menu.js`).
- **Variables/Functions:** camelCase.
- **Models:** PascalCase.

### Error Handling
- Use `try...catch` blocks in controllers.
- Return consistent JSON error responses: `{ "message": "error description" }`.
- Use appropriate HTTP status codes (400 for client errors, 404 for not found, 500 for server errors).

### Async/Await
- Prefer `async/await` over callbacks or raw promises.
- Use top-level await where appropriate (as enabled by ES Modules).

### Data Validation
- Use Mongoose schema-level validation.
- Perform manual validation in controllers for complex business logic.

## Workflows

### Database Seeding & Migration
- Seeding scripts are located in the root or `test-and-adjustdb/`.
- Run them via `npm run seed:<type>` (check `package.json` for available scripts).
- Always use the `--env-file=.env` flag when running scripts manually to ensure environment variables are loaded.

### Environment Variables
- Required variables: `MONGODB_URI`, `PORT`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Use a `.env` file for local development.

## Testing & Validation
- Before committing, ensure the server starts without errors: `npm start`.
- Verify new API endpoints using the `src/testhttps/test-api.rest` file (REST Client extension for VS Code).
