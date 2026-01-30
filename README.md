# Employee Management System (Backend)

## Project Overview

This repository contains the backend for a simple Employee Management System built with Node.js, Express and MongoDB. It supports admin and employee users, authentication via JWT, employee management (create/update/delete/fetch), and task creation/assignment with task state transitions (new, completed, failed).

## Features
- Admin registration and login
- Employee registration (performed by authenticated admin)
- Login for employees and admins (single login endpoint)
- JWT-based authentication middleware
- Create tasks and assign to employees
- Fetch all employees and fetch the currently logged-in employee
- Update employee details and delete employees
- Mark tasks as completed or failed (task lifecycle management)
- DB connection with auto-reconnect logic (middleware ensures connection per request)

## Tech Stack
- Node.js
- Express
- MongoDB (via Mongoose)
- JSON Web Tokens (JWT) for auth
- bcryptjs for password hashing
- express-validator for request validation
- dotenv for environment configuration
- cookie-parser, cors

## Important Files
- [app.js](app.js) — application entry (Express app, DB connection, middleware)
- [routes/user.routes.js](routes/user.routes.js) — all HTTP API routes
- [models/Admin.model.js](models/Admin.model.js) — admin schema
- [models/Employee.model.js](models/Employee.model.js) — employee schema and assigned tasks arrays
- [models/Task.model.js](models/Task.model.js) — task schema
- [middleware/FetchUser.js](middleware/FetchUser.js) — JWT auth middleware
- [config/db.js](config/db.js) — simple DB connector

## Environment Variables
Create a `.env` file in the backend folder with at least the following:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

## Setup & Run
1. Install dependencies:

```bash
npm install
```

2. Start the server (project exposes `app.js` as the Express app):

```bash
# for local development you may run an express server wrapper (not included).
# Vercel script points to `app.js`.
npm run vercel-start
```

Notes: `package.json` contains a `vercel-start` script that runs `node app.js`. If you prefer a dedicated server file (e.g., `server.js`) that calls `app.listen(...)`, add one and update `package.json` scripts accordingly.

## Authentication Flow
- Users (admin or employee) login via `POST /login` with `{ email, password }`.
- On successful login the server responds with `{ message, role, token }` where `token` is a JWT.
- Protected endpoints require an `Authorization` header with value `Bearer <token>`; the middleware `middleware/FetchUser.js` validates the token and attaches `req.user` with `userid`, `username`, and `role`.

## Data Models

- Admin
  - `username` (String, required)
  - `email` (String, required, unique)
  - `password` (String, hashed)

- Employee
  - `username` (String, required)
  - `email` (String, required, unique)
  - `password` (String, hashed)
  - `assignedTasks` — object with arrays:
    - `newTask` — ObjectId[] pointing to `tasks`
    - `completed` — ObjectId[] pointing to `tasks`
    - `failed` — ObjectId[] pointing to `tasks`

- Task (`tasks` collection)
  - `taskTitle`, `taskDate`, `taskAssign`, `taskCategory`, `taskDescription`
  - `user` — ObjectId reference to the assigned `employee`

## API Endpoints (summary)

All endpoints are relative to the backend base (the Express app mounts `routes/user.routes.js` at `/`).

- POST /register/admin
  - Public
  - Body: `{ username, email, password }`
  - Creates an admin user. Validates username length >=3 and password >=5.

- POST /login
  - Public
  - Body: `{ email, password }`
  - Returns `{ message, role, token }` on success.

- GET /auth/check
  - Protected
  - Returns `{ authenticated: true, user: { userid, username, role } }` if token valid.

- POST /register/employee
  - Protected (admin or any authenticated user per current middleware)
  - Body: `{ username, email, password }`
  - Creates an employee record.

- POST /createtask
  - Protected
  - Body: `{ taskTitle, taskDate, taskAssign, taskCategory, taskDescription }`
  - Creates a task, links `user` (employee._id) and pushes task id into employee.assignedTasks.newTask.

- POST /logout
  - Public (no server-side cookie clearing active in current code)
  - Removes token from client localStorage (client-side only). Responds `{ message: 'Logged Out' }`.

- GET /fetch-employees
  - Public
  - Returns list of all employees populated with their `assignedTasks.*` arrays.

- GET /fetch-loggedin-user
  - Protected
  - Returns the currently authenticated employee with populated task lists.

- PUT /update-employee/:id
  - Protected
  - Body may include `username`, `email`, `password` — updates employee by id.

- DELETE /delete-employee/:id
  - Protected
  - Deletes employee by id.

- PUT /complete-task/:id
  - Protected
  - Marks a task (id) as completed for the logged-in user: removes from `newTask`, adds to `completed`.

- PUT /failed-task/:id
  - Protected
  - Marks a task as failed for the logged-in user: removes from `newTask`, adds to `failed`.

## Request Validation & Errors
- The project uses `express-validator` to validate inputs for registration and login.
- Common error responses are returned with status codes: `400` for client errors, `401` for unauthorized, `500` for server errors.

## Database & Connection Handling
- `app.js` implements an async `connectToDB()` with a flag `isConnected` to avoid repeated connects. The app calls `connectToDB()` on startup and also includes a per-request middleware that attempts to reconnect if `isConnected` is false.
- `config/db.js` contains a minimal connector function but the app uses the inline `connectToDB()` in `app.js`.

## Client Notes
- The backend expects clients to store and send JWT tokens in the `Authorization` header as `Bearer <token>`.
- The `/logout` route currently calls `localStorage.removeItem('authToken')` (client-side) and does not clear any server cookie — update if you use cookies.