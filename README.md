# Musicozy

Musicozy is a music-listening web application with account access, track search, playback controls, and listening history.

## Project structure

### Frontend
- `frontend/index.html` — Discover page, track search, recent tracks, and music player.
- `frontend/login.html` — Sign-in and account-creation interface.
- `frontend/styles.css` — Shared styling and responsive layouts.
- `frontend/Login_page_image.png` — Artwork used on the login and Discover pages.

### Backend (`backend/`)

- `server.js` — Main Express application. Loads environment variables, connects to MongoDB, serves frontend files, mounts API routes, and implements track search through the YouTube Data API.
- `package.json` — Lists the Node.js dependencies used by the backend.
- `package-lock.json` — Locks dependency versions for repeatable installs.
- `.gitignore` — Excludes `node_modules/` and `.env` from Git.
- `config/db.js` — Connects Mongoose to MongoDB. If the connection is unavailable, the app continues in its in-memory fallback mode.
- `models/user.js` — Mongoose schema for user accounts, profile details, music interests, and activity timestamps. Hashes passwords with bcrypt before saving and provides a password-comparison method.
- `models/History.js` — Mongoose schema for listening activity, including user, track, action type, action weight, and timestamp.
- `controllers/authController.js` — Implements sign-up and login, checks credentials, hashes/checks passwords, and issues JWTs. Includes an in-memory user fallback.
- `controllers/userController.js` — Fetches and updates the authenticated user's profile.
- `controllers/historyController.js` — Saves, retrieves, and deletes listening-history entries. Includes an in-memory history fallback.
- `middleware/authMiddleware.js` — Verifies a Bearer JWT and attaches the authenticated user's ID to the request. Used for protected profile routes.
- `routes/authRoutes.js` — Defines sign-up and login routes.
- `routes/userRoutes.js` — Defines protected profile routes.
- `routes/historyRoutes.js` — Defines history routes and optional authentication, allowing guest activity as well.

## Backend API endpoints

These are the application's own Express API routes:

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Create an account; returns a JWT and user details. | Not required |
| `POST` | `/api/auth/login` | Verify credentials; returns a JWT and user details. | Not required |
| `GET` | `/api/users/profile` | Fetch the signed-in user's profile. | Bearer JWT required |
| `PUT` | `/api/users/profile` | Update the signed-in user's profile. | Bearer JWT required |
| `POST` | `/api/history` | Record a play, like, completion, skip, or other supported activity. | Optional; guests are supported |
| `GET` | `/api/history` | Retrieve listening history. | Optional; guests are supported |
| `DELETE` | `/api/history/:historyId` | Delete a history entry. | Optional middleware is used |

Track search is also provided by `GET /api/search?q=<search term>` in `server.js`. It does not require a user JWT.

## External APIs and services

- **YouTube Data API v3 — Search endpoint:** `GET https://www.googleapis.com/youtube/v3/search`. Searches for music videos using the query plus `official audio`, restricted to video results in the Music category.
- **YouTube Data API v3 — Videos endpoint:** `GET https://www.googleapis.com/youtube/v3/videos`. Retrieves video content details so the backend can read durations and keep tracks between 60 and 400 seconds.
- **YouTube IFrame Player embed:** `https://www.youtube.com/embed/{videoId}`. The frontend loads the selected YouTube video in an embedded iframe and sends playback commands through `postMessage` (play, pause, seek, volume). This is used for playback; it is not an Express route.
- **MongoDB:** Stores user accounts and listening history through Mongoose. It is the database service rather than a third-party HTTP API.

## Run locally

1. Install [Node.js](https://nodejs.org/). Set up MongoDB if persistent accounts and history are required.
2. Open a terminal in `backend/` and install dependencies:

   ```bash
   npm install
   ```

3. Create `backend/.env` with the required configuration:

   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   YT_Key=your_youtube_data_api_key
   ```

4. Start the server:

   ```bash
   node server.js
   ```

5. Visit `http://localhost:5000`.

The backend reads the YouTube API key from `YT_Key`. Search requires a valid key. MongoDB enables persistent storage; the code includes in-memory fallback data when MongoDB is not connected.

## Security note

Keep `.env` private. Never commit API keys, database credentials, or JWT secrets to version control.
