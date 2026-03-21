# Chat Support Application

Full-stack chat support system with a chatbot interface and admin ticket management dashboard.

## Project Structure

```
Chat support/
├── backend/        # Node.js + Express + MongoDB API
└── frontend/       # React + Vite + Tailwind CSS
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port 27017

---

## Setup & Run

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Server runs at: http://localhost:5000

### 2. Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:3000

---

## Usage

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Chatbot (user side) |
| http://localhost:3000/admin/login | Admin login |
| http://localhost:3000/admin | Admin dashboard (after login) |

### Default Admin Credentials
- **Username:** admin
- **Password:** admin123

---

## Features

### Chatbot
- Greeting message on open
- Collects issue description + email/phone
- Validates email format and 10-digit Indian mobile numbers
- Shows summary before submission
- Creates ticket and displays Ticket ID

### Admin Dashboard
- JWT-authenticated login
- Ticket inbox with all tickets
- Stats cards (Total / Assigned / Fixed / Closed)
- Search by ticket ID, contact, or issue text
- Filter by status
- View and update ticket status + notes
- Status flow: Assigned → Fixed → Closed

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Admin login |
| POST | /api/tickets | No | Create ticket (chatbot) |
| GET | /api/tickets | Yes | Get all tickets |
| GET | /api/tickets/:id | Yes | Get single ticket |
| PATCH | /api/tickets/:id | Yes | Update ticket status/notes |

---

## Environment Variables (backend/.env)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-support
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```
