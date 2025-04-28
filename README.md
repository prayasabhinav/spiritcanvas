# SpiritCanvas

## Overview
SpiritCanvas is a web application for exploring, selecting, and personalizing career pathways. Users can select up to three pathways, track their progress, and personalize the tasks required for each skill. Admins can manage pathways and tasks globally.

## Features
- **User Pathway Selection:** Each user can select exactly three pathways to work on.
- **Per-User Progress Tracking:** Each user's progress (task completion) is saved independently and persists across sessions.
- **Custom Tasks (Personalise Modal):**
  - Users can click the "Personalise" button under any skill card to edit up to 5 custom tasks for that skill.
  - These custom tasks are saved in the user's own data and do not affect other users.
  - The modal for editing tasks is fully customizable via CSS classes in `style.css`.
- **Admin Controls:**
  - Admins can add, edit, and delete pathways and tasks globally.
  - Admins' changes affect all users.
- **Profile Page:**
  - Users can view their selected pathways and remove them.
  - Users can only select new pathways if they have fewer than three selected.

## Setup
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values (MongoDB URL, Google OAuth, etc).
3. **Run the app:**
   ```bash
   npm start
   ```
4. **Access the app:**
   - Visit `http://localhost:3000` in your browser.

## Usage
- **Selecting Pathways:**
  - On first login, select three pathways to begin.
  - You will be redirected to the canvas view.
- **Tracking Progress:**
  - Tick off tasks as you complete them. Your progress is saved automatically.
- **Personalising Tasks:**
  - Click the "Personalise" button under any card to edit up to 5 custom tasks for that skill.
  - Your custom tasks are saved and shown only to you.
- **Admin Management:**
  - Admins can access the pathway management pages to edit all pathways and tasks.

## Customizing the Personalise Modal
- The Personalise modal uses the following CSS classes for styling:
  - `.personalise-modal-content`
  - `.personalise-modal-header`
  - `.personalise-modal-body`
  - `.personalise-modal-actions`
  - `.personalise-modal-input`
- To change the look and feel, edit these classes in `style.css`.

## API Endpoints
- `GET /api/pathways` — List all pathways (authenticated users)
- `GET /api/pathways/all` — List all pathways (admin only)
- `GET /api/user/progress/:pathwayId` — Get per-user progress for a pathway
- `PUT /api/user/progress/:pathwayId` — Save per-user progress for a pathway

## Notes
- Only admins can edit the global set of pathways and tasks.
- All users can personalize their own tasks and track their own progress.
- The app uses MongoDB for persistent storage.

## License
MIT

---

## Project Structure

```
.
├── server.js                # Main Express server
├── script.js                # Frontend logic (vanilla JS)
├── style.css                # Main styles
├── index.html               # Main SPA entry point
├── views/                   # EJS templates (admin, partials, home, login)
│   ├── admin/
│   │   ├── edit-pathways-list.ejs
│   │   └── edit-pathway-details.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── home.ejs
│   └── login.ejs
├── models/                  # Mongoose models (User.js)
├── middleware/              # Auth and admin middleware
├── config/                  # Passport config
├── routes/                  # Auth routes
├── admins.txt               # List of admin emails
├── package.json             # Node dependencies and scripts
├── captain-definition       # CapRover deployment config
├── make-caprover-tar.sh     # Script for CapRover deployment
└── ...                      # Other files
```

---

## Setup & Installation

### 1. Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Google OAuth credentials (Client ID, Secret, Callback URL)
- CapRover (optional, for deployment)

### 2. Clone the Repository

```bash
git clone <your-repo-url>
cd spiritcanvas-h
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Variables

Create a `.env` file in the root directory with the following:

```
ENABLE_MONGODB=true
MONGODB_URL=mongodb://localhost:27017/spiritcanvas
SESSION_SECRET=your-session-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
NODE_ENV=development
```

### 5. Admin Users

Add admin emails (one per line) to `admins.txt`:

```
me@prayas.in
```

---

## Running the App

```bash
npm start
```

- Visit `http://localhost:3000` in your browser.
- Sign in with Google.
- Select 3 pathways to build your canvas.
- Admins can access `/admin/edit-pathways` to manage pathways.

---

## Deployment

### CapRover

1. Build a tarball for CapRover:

   ```bash
   ./make-caprover-tar.sh full
   ```

2. Upload the generated `.tar` file to your CapRover app.

3. CapRover uses `captain-definition` for Docker build:

   ```json
   {
     "schemaVersion": 2,
     "dockerfileLines": [
       "FROM node:18-alpine",
       "WORKDIR /usr/src/app",
       "COPY . .",
       "RUN npm install --production",
       "EXPOSE 3000",
       "CMD [\"npm\", \"start\"]"
     ]
   }
   ```

---

## Customization

- **Pathways & Cards**: Admins can edit pathways, cards, and tasks via the admin panel.
- **Styling**: Modify `style.css` for custom themes.
- **Templates**: EJS templates in `views/` for admin and partials.

---

## File/Folder Reference

- `server.js`: Express server, routes, session, MongoDB, admin logic.
- `script.js`: Handles SPA navigation, pathway selection, canvas logic.
- `style.css`: Main styles for all pages.
- `index.html`: Main SPA entry point.
- `views/`: EJS templates for admin and login pages.
- `models/`: Mongoose models (User.js).
- `middleware/`: Auth and admin middleware.
- `config/`: Passport.js config for Google OAuth.
- `routes/`: Auth routes.
- `admins.txt`: List of admin emails.
- `make-caprover-tar.sh`: Script to package app for CapRover.
- `captain-definition`: CapRover deployment config.

---

## Admin Features

- `/admin/edit-pathways`: List and select pathways to edit.
- `/admin/edit-pathway/:id`: Edit pathway name, description, cards, and tasks.
- Only emails in `admins.txt` have admin access.

---

## Security

- Only authenticated users can access main features.
- Only admins (emails in `admins.txt`) can access admin routes.
- Sessions are stored in MongoDB if enabled.

---

## Credits

- Developed by Prayas Abhinav and contributors.
- Uses [Express](https://expressjs.com/), [MongoDB](https://www.mongodb.com/), [Passport](http://www.passportjs.org/), [EJS](https://ejs.co/), and [CapRover](https://caprover.com/).

---

## Support

For issues, open a GitHub issue or contact the maintainer. 