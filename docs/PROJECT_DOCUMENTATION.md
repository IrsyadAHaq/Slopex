# Project Documentation

## Overview

This repository contains a **Node.js** backend built with **Express.js**. It provides RESTful APIs for authentication, drainage data handling, and integrates a WhatsApp bot via `whatsapp-web.js`.

---

## Technology Stack

| Layer | Technology / Library | Purpose |
|-------|----------------------|---------|
| **Runtime** | **Node.js (v20+)** | JavaScript execution environment |
| **Web Framework** | **Express.js** | Routing, middleware, request handling |
| **Authentication** | **jsonwebtoken**, **bcryptjs** | JWT creation/validation, password hashing |
| **Security** | **helmet**, **express-rate-limit**, **cors** | HTTP header security, rate‑limiting, CORS |
| **Real‑time** | **socket.io** | WebSocket communication for live updates |
| **WhatsApp Bot** | **whatsapp‑web.js** | Automates WhatsApp messaging via web client |
| **Utilities** | **axios**, **archiver**, **tar**, **uuid**, **ssh2**, **nodemailer**, **qrcode‑terminal** | HTTP requests, file archiving/compression, unique IDs, SSH, email, QR code generation |
| **Development** | **nodemon**, **concurrently** | Auto‑restart on changes, run multiple processes |

---

## Project Structure

```
.
├─ .env                # Environment variables (port, secrets, etc.)
├─ .gitignore          # Files ignored by Git
├─ Dockerfile & docker‑compose.yml   # Containerisation (optional)
├─ package.json        # npm scripts & dependencies
├─ server.js           # Entry point – creates Express app & starts HTTP server
├─ controllers/        # Business‑logic functions (e.g., authController.js)
├─ routes/             # Express routers mapping URLs to controllers
├─ models/             # Data schemas / ORM models (placeholder)
├─ middleware/         # Reusable middle‑wares (auth, error handling)
├─ utils/              # Helper functions (e.g., token generation)
├─ public/             # Static assets served to client (JS, CSS, images)
├─ whatsapp‑bot/       # WhatsApp bot source code
└─ README.md           # Project overview (this file)
```

---

## Core Features & Algorithms

### 1️⃣ Authentication (JWT)
- **Algorithm**: HMAC‑SHA256 (default for `jsonwebtoken`).
- **Flow**:
  1. User submits email/password → `authController.login`.
  2. Password is verified with **bcryptjs** (salting + hashing).
  3. On success, a **JWT** is signed (`jwt.sign`) containing the user ID.
  4. Client stores the token (e.g., in `localStorage`) and includes it in the `Authorization: Bearer <token>` header for protected routes.
  5. Middleware (`verifyToken`) validates the token on each request.

### 2️⃣ Rate Limiting & Security
- **Algorithm**: Token bucket (implemented by `express-rate-limit`).
- **Purpose**: Prevent brute‑force attacks and API abuse.

### 3️⃣ Real‑time Updates (Socket.io)
- **Algorithm**: Event‑driven publish/subscribe.
- **Use‑case**: Emit events like `drainageUpdated` to connected clients whenever a drainage record changes.

### 4️⃣ WhatsApp Bot Automation
- **Library**: `whatsapp-web.js` abstracts the WebSocket connection to WhatsApp Web.
- **Workflow**:
  1. The bot logs in (QR code displayed via `qrcode-terminal`).
  2. Once authenticated, it listens for incoming messages.
  3. Custom logic (e.g., command parsing) lives in `whatsapp‑bot/`.

### 5️⃣ File Archiving & Compression
- **Libraries**: `archiver` (creates ZIP archives) and `tar` (creates TAR.GZ).
- **Typical Use**: Exporting data backups or logs for download.

---

## Getting Started

### Prerequisites
- **Node.js** (>= 20) and **npm** installed.
- (Optional) **Docker** if you prefer containerised development.

### Installation
```bash
# Clone repository (if not already)
git clone <repo‑url>
cd slopexV100

# Install dependencies
npm install
```

### Environment Variables
Create a `.env` file at the project root (sample):
```dotenv
PORT=3000
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
# DB_URI optional for future DB integration
```

### Running the Application
```bash
# Development (auto‑restart on changes)
npm run dev

# Production
npm start
```
Server will listen on `http://localhost:3000` (or the port defined in `.env`).

---

## Deployment (Optional)

### Docker
```bash
# Build Docker image
docker build -t slopex-backend .

# Run container
docker compose up -d
```
The container runs `npm start` inside.

### Production Checklist
- Set `NODE_ENV=production`.
- Use a process manager like **PM2** or run within Docker/Kubernetes.
- Secure the JWT secret and any other credentials.
- Enable HTTPS (terminate at a reverse proxy like Nginx).

---

## Testing (Placeholder)
The repo includes `test-model.js` as a simple example. For proper testing, add **Jest** or **Mocha** and write unit tests for each controller and route.

---

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/awesome-feature`).
3. Commit your changes with clear messages.
4. Open a Pull Request describing the change.

All contributions should follow the existing coding style (ES6, async/await, linting via ESLint). Feel free to add unit tests for new functionality.

---

## 📜 License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

## 📞 Contact

For questions or collaboration, reach out via:
- Email: dev@example.com
- WhatsApp Bot: scan the QR code generated on first bot start.

---

*Generated by Antigravity – your AI coding assistant.*
