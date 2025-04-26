# SpiritCanvas

**SpiritCanvas** is a web application for managing creative career pathways with a visual canvas. Users can select pathways, track progress, and organize their journey in art and design. Admins can edit pathways and their tasks.

---

## Features

- **Google Authentication**: Secure login via Google OAuth.
- **Pathway Selection**: Users select 3 pathways to build their personalized canvas.
- **Visual Canvas**: Track progress on cards and tasks for each pathway.
- **Admin Panel**: Admins can add, edit, and manage pathways, cards, and tasks.
- **MongoDB Support**: Stores pathways, cards, and user progress.
- **CapRover Ready**: Easy deployment with CapRover and Docker.

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

## License

ISC (see `package.json`)

---

## Credits

- Developed by Prayas Abhinav and contributors.
- Uses [Express](https://expressjs.com/), [MongoDB](https://www.mongodb.com/), [Passport](http://www.passportjs.org/), [EJS](https://ejs.co/), and [CapRover](https://caprover.com/).

---

## Support

For issues, open a GitHub issue or contact the maintainer. 
