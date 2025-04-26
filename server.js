require('dotenv').config();
const express = require('express');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const fs = require('fs');
const fsPromises = fs.promises;
const User = require('./models/User'); // Make sure this line exists

const app = express();

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const PORT = process.env.PORT || 3000;

// Get MongoDB connection string from environment (must be set in CapRover app config)
const MONGODB_URL = process.env.MONGODB_URL;

const ENABLE_MONGODB = process.env.ENABLE_MONGODB !== 'false';

if (ENABLE_MONGODB && !MONGODB_URL) {
    console.error('FATAL: MONGODB_URL environment variable is not set but ENABLE_MONGODB is true.');
    process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
    let dbStatus = 'disabled';
    if (ENABLE_MONGODB && mongoose && mongoose.connection) {
        dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    }
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development',
        mongodbUri: ENABLE_MONGODB ? MONGODB_URL : undefined
    });
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Session configuration with MongoDB store (only if MongoDB is enabled)
let mongoose, MongoStore, Pathway, connectDB, seedDatabase, defaultPathways;
if (ENABLE_MONGODB) {
    mongoose = require('mongoose');
    MongoStore = require('connect-mongo');

    // --- Mongoose Schema and Model ---
    const itemSchema = new mongoose.Schema({
        text: { type: String, default: 'New Task...' },
        completed: { type: Boolean, default: false }
    });
    const cardSchema = new mongoose.Schema({
        title: { type: String, default: 'Card Title' },
        items: [itemSchema] // Array of items
    });
    const pathwaySchema = new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        description: { type: String, default: '' },
        cards: [cardSchema] // Array of cards associated with the pathway
    });
    Pathway = mongoose.model('Pathway', pathwaySchema);

    // --- Database Seeding ---
    let defaultPathwaysRaw = [
        // Interaction Design Pathways - Updated for Entry-Level
        { name: "UX Designer", description: "Assist in designing user-friendly digital products" },
        { name: "UI Designer", description: "Focus on the visual and interactive elements of interfaces" },
        { name: "Interaction Design Intern", description: "Learn to create relationships between users and products" },
        { name: "Visual Designer", description: "Create visual assets and styles for digital interfaces" },
        { name: "Web Designer", description: "Design and develop user interfaces for websites" },
        { name: "Mobile App Designer", description: "Support the design of mobile application interfaces" },
        { name: "Game UI/UX Executive", description: "Help design user experiences for games" },
        { name: "User Research Practitioner", description: "Support user research activities to inform design" },
        { name: "Accessibility Design Assistant", description: "Help ensure digital products are accessible" },
        { name: "Design Production Artist", description: "Prepare and finalize design assets for development" },

        // Graphic Design & Illustration Pathways - Updated for Entry-Level
        { name: "Graphic Designer", description: "Assist in creating visual concepts for communication" },
        { name: "Brand Identity Expert", description: "Support the creation of visual identities for brands" },
        { name: "Editorial Designer", description: "Help design layouts for publications" },
        { name: "Packaging Design Executive", description: "Assist in creating product packaging designs" },
        { name: "Illustrator", description: "Create original artwork for various media" },
        { name: "Production Artist", description: "Prepare design files for print or digital production" },
        { name: "Marketing Designer", description: "Design visual materials for marketing campaigns" },
        { name: "Social Media Designer", description: "Create graphics for social media platforms" },
        { name: "Presentation Designer", description: "Design visual aids for presentations" },
        { name: "Icon Designer", description: "Support the creation of icons for interfaces" },

        // Fine Art Pathways - Updated for Entry-Level
        { name: "Studio Artist", description: "Create fine art pieces" },
        { name: "Artist Assistant", description: "Support established artists in their studio practice" },
        { name: "Gallery Assistant", description: "Assist with operations and exhibitions in art galleries" },
        { name: "Art Handler", description: "Safely handle, install, and pack artworks" },
        { name: "Muralist", description: "Help create large-scale paintings on walls" },
        { name: "Printmaking Assistant", description: "Support printmaking processes and studio maintenance" },
        { name: "Sculpture Studio Assistant", description: "Assist with fabrication and finishing of sculptures" },
        { name: "Art Education Facilitator", description: "Support art teaching activities" },
        { name: "Museum Operations Manager", description: "Help with visitor services and collection care in museums" },
        { name: "Community Arts Facilitator", description: "Assist in organizing and leading community art projects" },

        // Animation & Motion Pathways - Updated for Entry-Level
        { name: "Junior 2D Animator", description: "Assist in creating 2D animations" },
        { name: "Junior 3D Modeler", description: "Help create three-dimensional digital models" },
        { name: "Character Designer", description: "Support the design of characters for media" },
        { name: "Storyboard Artist", description: "Make changes to storyboards based on feedback" },
        { name: "Junior VFX Artist", description: "Assist in creating visual effects" },
        { name: "Stop Motion Animator", description: "Help create stop motion animations" },
        { name: "Motion Graphics Artist", description: "Support the creation of motion graphics" },
        { name: "Junior 3D Animator", description: "Assist in creating 3D character animation" },
        { name: "Animation Production Assistant", description: "Provide general support to animation teams" },
        { name: "Asset Preparation Artist", description: "Prepare digital assets for animation pipelines" },

        // Photography & Film Pathways - Updated for Entry-Level
        { name: "Photographer", description: "Support photographers during shoots and post-production" },
        { name: "Photo Retoucher", description: "Edit and enhance digital photographs" },
        { name: "Video Editor", description: "Help edit video footage for various projects" },
        { name: "Production Assistant (Film/Video)", description: "Provide general support on film and video sets" },
        { name: "Camera Operator", description: "Support camera crews during filming" },
        { name: "Lighting Assistant", description: "Help set up and manage lighting equipment" },
        { name: "Sound Recordist Assistant", description: "Support audio recording on set" },
        { name: "Digital Imaging Technician (DIT)", description: "Help manage digital footage on set" },
        { name: "Social Media Video Creator", description: "Produce short-form video content for social media" },
        { name: "Content Creator (Photo/Video)", description: "Create engaging visual content for online platforms" },

        // Craft & Product Pathways - Updated for Entry-Level
        { name: "Design Assistant (Product/Furniture)", description: "Support designers in developing new products" },
        { name: "Textile Designer", description: "Help create patterns and designs for fabrics" },
        { name: "Jewelry Production Assistant", description: "Assist in the fabrication and finishing of jewelry" },
        { name: "Ceramics Studio Assistant", description: "Support operations in a ceramics studio" },
        { name: "Fashion Design Assistant", description: "Support fashion designers in the design process" },
        { name: "Industrial Design Intern", description: "Learn about designing mass-produced products" },
        { name: "Model Maker", description: "Create physical prototypes and models" },
        { name: "Craft Studio Manager", description: "Provide general support in a craft-based studio" },
        { name: "Materials Researcher", description: "Investigate and document materials for design use" },
        { name: "CAD Technician", description: "Help create technical drawings using CAD software" },

        // Digital Art Pathways - Updated for Entry-Level
        { name: "Digital Artist", description: "Assist in creating artwork using digital tools" },
        { name: "Digital Painter", description: "Support digital painting workflows" },
        { name: "Creative Coder", description: "Help develop creative projects using code" },
        { name: "Junior 3D Artist (Generalist)", description: "Assist with various tasks in 3D production" },
        { name: "Interactive Media Designer", description: "Support the design of interactive digital experiences" },
        { name: "AR/VR Asset Creator", description: "Create 3D models and assets for AR/VR" },
        { name: "UI Artist (Games/Apps)", description: "Design visual elements for user interfaces" },
        { name: "Concept Art Executive", description: "Support concept artists in visual development" },
        { name: "Digital Asset Managert", description: "Help organize and manage digital art files" },
        { name: "Tech Art Assistant", description: "Support the technical aspects of digital art pipelines" }
    ];

    // Populate default pathways with sample cards and items
    defaultPathways = defaultPathwaysRaw.map(pathway => {
        const cards = [];
        for (let i = 1; i <= 12; i++) {
            const items = [];
            for (let j = 1; j <= 5; j++) {
                items.push({ text: `Sample Task ${j}`, completed: false });
            }
            cards.push({ title: `Sample Card ${i}`, items: items });
        }
        return { ...pathway, cards: cards };
    });

    seedDatabase = async () => {
        try {
            // Delete all existing pathways
            await Pathway.deleteMany({});
            console.log('Deleted all existing pathways from database');

            // Seed with default pathways
            await Pathway.insertMany(defaultPathways);
            console.log(`Database seeded with ${defaultPathways.length} default career pathways`);
        } catch (err) {
            console.error('Error seeding database:', err);
        }
    };

    connectDB = async () => {
        try {
            console.log('Attempting to connect to MongoDB...');
            console.log('MongoDB URL:', MONGODB_URL);
            
            await mongoose.connect(MONGODB_URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000
            });
            
            console.log('MongoDB Connected...');
            await seedDatabase(); // Seed database after connection
        } catch (err) {
            console.error('MongoDB connection error:', err.message);
            console.error('Error details:', err);
            // Attempt to reconnect after a delay
            console.log('Attempting to reconnect in 5 seconds...');
            setTimeout(connectDB, 5000);
        }
    };

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected. Attempting to reconnect...');
        setTimeout(connectDB, 5000); // Attempt reconnect on disconnect
    });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error event:', err.message);
        // Mongoose might attempt reconnection automatically depending on version/config
        // but we add explicit logic just in case.
    });

    // Session configuration with MongoDB store (only if MongoDB is enabled)
    app.set('trust proxy', 1);
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: MONGODB_URL,
            collectionName: 'sessions',
            ttl: 24 * 60 * 60, // 1 day
            autoCreateIndex: false
        }),
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }
    }));
} else {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false
    }));
}

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport config (conditionally load if file exists)
const passportConfigPath = path.join(__dirname, 'config', 'passport.js');
if (fs.existsSync(passportConfigPath)) {
    require('./config/passport')(passport);
}

// Conditional middleware loading for express-only mode
let ensureAuth = (req, res, next) => next();
let ensureGuest = (req, res, next) => next();
let ensureAdmin = (req, res, next) => next();
let isAdmin = () => false;

const authMiddlewarePath = path.join(__dirname, 'middleware', 'auth.js');
if (fs.existsSync(authMiddlewarePath)) {
    const authMiddleware = require('./middleware/auth');
    ensureAuth = authMiddleware.ensureAuth;
    ensureGuest = authMiddleware.ensureGuest;
}

const adminMiddlewarePath = path.join(__dirname, 'middleware', 'admin.js');
if (fs.existsSync(adminMiddlewarePath)) {
    const adminMiddleware = require('./middleware/admin');
    ensureAdmin = adminMiddleware.ensureAdmin;
    isAdmin = adminMiddleware.isAdmin;
}

// Set global variables for templates
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Conditionally load /auth route if it exists
const authRoutePath = path.join(__dirname, 'routes', 'auth.js');
if (fs.existsSync(authRoutePath)) {
    app.use('/auth', require('./routes/auth'));
}

// Home route - show welcome page for guests, dashboard for authenticated users
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        // Authenticated users are redirected to dashboard
        console.log('User is authenticated, redirecting to dashboard');
        res.redirect('/dashboard');
    } else {
        // Guests see the welcome page
        console.log('User is not authenticated, serving welcome page');
        res.render('home');
    }
});

// Dashboard - main entry point after authentication
app.get('/dashboard', ensureAuth, (req, res) => {
    // We'll send the index.html file with console logs for debugging
    console.log('Serving dashboard view');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// User Profile Page
app.get('/profile', ensureAuth, async (req, res) => {
    try {
        console.log('Serving profile page for user:', req.user.email);
        const user = await User.findById(req.user._id).populate('selectedPathways').lean();

        if (!user) {
            console.error('User not found for profile page:', req.user._id);
            return res.status(404).send('User not found');
        }

        res.render('profile', { 
            user: user, 
            title: 'User Profile' // Pass title for consistency
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Error loading profile page');
    }
});

// Pathway selection view
app.get('/pathways/select', ensureAuth, (req, res) => {
    console.log('Serving pathway selection view');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Pathway canvas view - for both GET and POST requests
app.get('/pathways/canvas', ensureAuth, (req, res) => {
    console.log('Serving pathway canvas view');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add body parser middleware for POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// POST endpoint to save selected pathways when navigating to canvas
app.post('/api/selected-pathways', ensureAuth, async (req, res) => { // Make async
    try {
        console.log('User saving selected pathways:', req.user.email);
        const pathwayIds = req.body.pathwayIds;

        if (!Array.isArray(pathwayIds) || pathwayIds.length !== 3) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select exactly 3 pathways' 
            });
        }

        // Validate that pathwayIds are valid ObjectId strings if using MongoDB
        if (ENABLE_MONGODB) {
             const { Types } = require('mongoose');
             const areValidIds = pathwayIds.every(id => Types.ObjectId.isValid(id));
             if (!areValidIds) {
                 return res.status(400).json({ success: false, message: 'Invalid pathway ID format.' });
             }
        } else {
             // Skip validation if MongoDB is not enabled, or add different validation
             console.log('MongoDB disabled, skipping pathway ID validation.');
        }

        // --- Save to User Document (Instead of Session) ---
        if (!req.user || !req.user._id) {
             console.error('User ID not found in request for saving pathways');
             return res.status(401).json({ success: false, message: 'Authentication error.' });
        }
        
        // Find the user and update their selectedPathways field
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { selectedPathways: pathwayIds },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            console.error('User not found in database for saving pathways:', req.user._id);
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        console.log('Saved selected pathways to user document:', req.user.email, pathwayIds);
        // --- End Save to User Document ---

        // Remove pathway data from session if it exists (optional cleanup)
        if (req.session.selectedPathways) {
            delete req.session.selectedPathways;
            req.session.save((err) => {
                 if (err) console.error('Error removing pathways from session after DB save:', err);
            });
        }

        return res.json({ 
            success: true, 
            message: 'Pathways saved successfully',
            redirectTo: '/pathways/canvas'
        });
    } catch (error) {
        console.error('Error saving pathways to database:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error when saving pathways'
        });
    }
});

// API endpoint to get the selected pathways from the USER DOCUMENT
app.get('/api/selected-pathways', ensureAuth, async (req, res) => { // Make async
    try {
        console.log('User getting selected pathways:', req.user.email);
        
        if (!req.user || !req.user._id) {
             console.error('User ID not found in request for getting pathways');
             return res.status(401).json({ success: false, message: 'Authentication error.' });
        }

        // Find the user and return their selected pathways
        // Use .populate() to get the full pathway objects if needed later,
        // but for now, just return the IDs as the client expects.
        const user = await User.findById(req.user._id).select('selectedPathways').lean();

        if (!user) {
            console.error('User not found in database for getting pathways:', req.user._id);
             // Return empty array if user not found, consistent with session behavior
             return res.json({ selectedPathways: [] }); 
        }

        const selectedPathways = user.selectedPathways || [];
        console.log('Getting selected pathways from user document:', selectedPathways);
        res.json({ selectedPathways });

    } catch (error) {
        console.error('Error getting selected pathways from database:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error when retrieving pathways'
        });
    }
});

// Check admin status endpoint
app.get('/api/check-admin', ensureAuth, (req, res) => {
    if (!req.user || !req.user.email) {
        console.log('User object or email missing in check-admin endpoint');
        return res.json({ isAdmin: false });
    }
    
    const isUserAdmin = isAdmin(req.user.email);
    console.log('Admin status check for', req.user.email, ':', isUserAdmin);
    res.json({ isAdmin: isUserAdmin });
});

// --- Profile Pathway Removal --- 
app.delete('/api/profile/pathways/:id', ensureAuth, async (req, res) => {
    try {
        const pathwayIdToRemove = req.params.id;
        const userId = req.user._id;

        console.log(`User ${req.user.email} attempting to remove pathway ${pathwayIdToRemove}`);

        // Validate pathwayId format
        if (ENABLE_MONGODB && !mongoose.Types.ObjectId.isValid(pathwayIdToRemove)) {
            return res.status(400).json({ success: false, message: 'Invalid pathway ID format.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { selectedPathways: pathwayIdToRemove } }, // Use $pull to remove item from array
            { new: true } // Return the updated document (optional)
        );

        if (!updatedUser) {
            console.error('User not found during pathway removal:', userId);
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        // Check if the pathway was actually removed (optional, as $pull won't error if not found)
        // const wasRemoved = !updatedUser.selectedPathways.includes(pathwayIdToRemove);
        // console.log(`Pathway ${pathwayIdToRemove} removal status for user ${req.user.email}: ${wasRemoved}`);

        console.log(`Successfully processed removal request for pathway ${pathwayIdToRemove} by user ${req.user.email}`);
        res.json({ success: true, message: 'Pathway removed successfully.' });

    } catch (error) {
        console.error('Error removing pathway from profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while removing pathway.'
        });
    }
});
// --- End Profile Pathway Removal ---

// Fetch ALL pathways (Admin Only)
app.get('/api/pathways/all', ensureAdmin, async (req, res) => {
    if (!ENABLE_MONGODB) {
        // If DB is disabled, return the static default pathways (WITH cards now)
        return res.json(defaultPathways || []); // Return full default pathways if DB disabled
    }
    try {
        // Fetch full pathway documents, including cards and items
        const pathways = await Pathway.find({}).lean(); // Remove .select() to get full documents
        res.json(pathways);
    } catch (error) {
        console.error("Error fetching all pathways:", error);
        res.status(500).json({ message: "Error fetching pathways" });
    }
});

// Update multiple pathways (Admin Only)
app.put('/api/pathways/all', ensureAdmin, async (req, res) => {
    if (!ENABLE_MONGODB) {
        return res.status(400).json({ message: "Database operations disabled" });
    }
    const updates = req.body; // Expecting an array of full pathway objects { _id, name, description, cards }

    if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid request body: Expected an array of pathway updates." });
    }

    try {
        const bulkOps = updates.map(update => {
             // Basic validation for card structure
             if (!update.cards || !Array.isArray(update.cards)) {
                // If cards are missing or not an array, don't try to update them.
                // Alternatively, you could throw an error or set cards to []
                console.warn(`Pathway update for ${update._id} is missing valid 'cards' array. Skipping card update.`);
                return {
                    updateOne: {
                        filter: { _id: update._id },
                        update: { $set: {
                            ...(update.name && { name: update.name }),
                            ...(update.description && { description: update.description }),
                            // Exclude cards from $set if invalid
                        } },
                        upsert: false
                    }
                };
            }
            // Add deeper validation for items within cards if needed

            return {
                updateOne: {
                    filter: { _id: update._id },
                    // Update name, description, and replace the entire cards array
                    update: { $set: {
                        ...(update.name && { name: update.name }),
                        ...(update.description && { description: update.description }),
                        cards: update.cards // Replace the cards array
                    } },
                    upsert: false // Do not create new pathways if ID doesn't exist
                }
            };
        }).filter(op => op); // Filter out any skipped updates if validation fails

        if (bulkOps.length > 0) {
            const result = await Pathway.bulkWrite(bulkOps, { ordered: false }); // unordered allows valid updates even if one fails
            console.log('Bulk pathway update result:', result);
             // Check for write errors
             if (result.hasWriteErrors()) {
                console.error('Bulk pathway update write errors:', result.getWriteErrors());
                // Decide how to report errors - could send back a summary
            }
            res.json({
                success: true,
                modifiedCount: result.modifiedCount,
                writeErrors: result.hasWriteErrors() ? result.getWriteErrors() : null
            });
        } else {
            res.json({ success: true, modifiedCount: 0, message: "No valid updates provided or processed." });
        }
    } catch (error) {
        console.error("Error updating pathways in bulk:", error);
        // Handle specific errors like validation errors if possible
        res.status(500).json({ message: `Error updating pathways: ${error.message}` });
    }
});

// --- NEW ADMIN EDIT PAGES --- 

// GET Route: List all pathways for editing (Admin Only)
app.get('/admin/edit-pathways', ensureAuth, ensureAdmin, async (req, res) => {
    try {
        let pathways;
        if (ENABLE_MONGODB) {
            pathways = await Pathway.find({}, 'name _id').sort({ name: 1 }).lean();
        } else {
            // Fallback for disabled DB - provide default names/ids (might need adjustment)
            pathways = defaultPathways.map((p, index) => ({ _id: `static_${index}`, name: p.name }));
        }
        res.render('admin/edit-pathways-list', { pathways: pathways, title: 'Edit Pathways' });
    } catch (error) {
        console.error("Error fetching pathways for admin list:", error);
        res.status(500).send("Error loading pathway list."); // Send simple error page/message
    }
});

// GET Route: Show edit form for a single pathway (Admin Only)
app.get('/admin/edit-pathway/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
        let pathway;
        if (ENABLE_MONGODB) {
            pathway = await Pathway.findById(req.params.id).lean();
        } else {
            // Fallback for disabled DB (won't really work without DB)
            // Find by matching static ID if possible, otherwise error
            const staticPathway = defaultPathways.find((p, index) => `static_${index}` === req.params.id);
            pathway = staticPathway ? { ...staticPathway, _id: req.params.id } : null;
        }

        if (!pathway) {
            return res.status(404).send("Pathway not found.");
        }
        res.render('admin/edit-pathway-details', { pathway: pathway, title: `Edit ${pathway.name}` });
    } catch (error) {
        console.error(`Error fetching pathway ${req.params.id} for admin edit:`, error);
        res.status(500).send("Error loading pathway details.");
    }
});

// POST Route: Handle saving changes for a single pathway (Admin Only)
app.post('/admin/edit-pathway/:id', ensureAuth, ensureAdmin, async (req, res) => {
    if (!ENABLE_MONGODB) {
        return res.status(400).send("Database operations disabled. Cannot save changes.");
    }
    try {
        const pathwayId = req.params.id;
        // Get name, description, and the new cardsText field
        const { name, description, cardsText } = req.body; 

        // --- Parse cardsText into cardsData structure ---
        let cardsData = [];
        let currentCard = null;
        // Handle potential null/undefined cardsText and split lines reliably
        const lines = (cardsText || '').split(/\r?\n/);

        for (const line of lines) {
            const trimmedLine = line.trim();
            // Regex to match item lines: start, dash, space, square bracket, space or x, close bracket, space, capture rest
            const itemMatch = trimmedLine.match(/^- \[([ x])\] (.*)/); 

            if (!trimmedLine) {
                // Blank line potentially separates cards
                if (currentCard) {
                    cardsData.push(currentCard);
                    currentCard = null;
                }
            } else if (itemMatch) {
                // Line is an item
                if (!currentCard) {
                    // Item without a card title beforehand
                    // Option 1: Create a default card title
                     console.warn(`Orphaned item found: "${trimmedLine}". Assigning to 'Untitled Card'.`);
                     currentCard = { title: 'Untitled Card', items: [] };
                    // Option 2: Skip orphaned item (uncomment below and comment above)
                    // console.warn(`Orphaned item found and skipped: "${trimmedLine}"`);
                    // continue;
                }
                 const completed = itemMatch[1] === 'x';
                 const text = itemMatch[2].trim();
                 // Only add item if text is not empty
                 if (text) {
                    currentCard.items.push({ text: text, completed: completed });
                 } else {
                     console.warn(`Skipping item with empty text from line: "${trimmedLine}"`);
                 }

            } else {
                // Line is potentially a card title
                if (currentCard) {
                    // New title encountered, save the previous card (if it wasn't just empty lines)
                    if (currentCard.title || currentCard.items.length > 0) {
                         cardsData.push(currentCard);
                    }
                }
                // Start a new card, use default if title is empty
                 currentCard = { title: trimmedLine || 'Untitled Card', items: [] }; 
            }
        }
        // Add the last processed card if it exists and has content
        if (currentCard && (currentCard.title || currentCard.items.length > 0)) {
            cardsData.push(currentCard);
        }
        // --- End Parsing ---


        console.log(`Admin ${req.user.email} updating pathway ${pathwayId}`);
        console.log('Parsed cardsData:', JSON.stringify(cardsData, null, 2)); // Log parsed data for debugging

        const updatedPathway = await Pathway.findByIdAndUpdate(
            pathwayId,
            { 
                $set: { 
                    name: name,
                    description: description,
                    cards: cardsData // Use the parsed data
                } 
            },
            { new: true, runValidators: true } // Return updated doc, run schema validation
        );

        if (!updatedPathway) {
            return res.status(404).send("Pathway not found during update.");
        }

        console.log(`Successfully updated pathway ${pathwayId}`);
        // Redirect back to the list page after saving
        // Optionally add a query param for success message: res.redirect('/admin/edit-pathways?success=true');
        res.redirect('/admin/edit-pathways'); 

    } catch (err) {
        console.error(`Error updating pathway ${req.params.id}:`, err);
        // Provide more specific error messages if possible (e.g., validation errors)
        if (err.name === 'ValidationError') {
             // Re-render the form with an error message
             // Need to fetch the pathway data again ideally
            return res.status(400).send(`Validation Error: ${err.message}. Please go back and correct the data.`);
        }
        res.status(500).send(`Server error updating pathway: ${err.message}`);
    }
});

// --- Static Files ---
// Serve static files (HTML, CSS, JS) from the current directory
app.use(express.static(path.join(__dirname)));

// --- API Endpoints ---
// Require authentication for all API endpoints
if (ENABLE_MONGODB) {
    app.get('/api/pathways', ensureAuth, async (req, res) => {
        try {
            // Fetch full pathway documents, including cards and items
            const pathways = await Pathway.find().sort({ name: 1 }); 
            res.json(pathways); // Send the full pathway objects
        } catch (err) {
            console.error('Error fetching pathways:', err);
            res.status(500).json({ message: 'Server error fetching pathways' });
        }
    });

    // Admin-only endpoints for pathway management
    app.post('/api/pathways', ensureAuth, ensureAdmin, async (req, res) => {
        try {
            console.log('Admin creating new pathway:', req.user.email);
            const { name, description } = req.body;
            const pathway = new Pathway({ name, description });
            await pathway.save();
            res.json({ success: true, pathway });
        } catch (err) {
            console.error('Error creating pathway:', err);
            res.status(500).json({ message: 'Server error creating pathway' });
        }
    });

    app.put('/api/pathways/:id', ensureAuth, ensureAdmin, async (req, res) => {
        try {
            console.log('Admin updating pathway:', req.user.email);
            const { name, description } = req.body;
            const pathway = await Pathway.findByIdAndUpdate(
                req.params.id,
                { name, description },
                { new: true }
            );
            res.json({ success: true, pathway });
        } catch (err) {
            console.error('Error updating pathway:', err);
            res.status(500).json({ message: 'Server error updating pathway' });
        }
    });

    app.delete('/api/pathways/:id', ensureAuth, ensureAdmin, async (req, res) => {
        try {
            console.log('Admin deleting pathway:', req.user.email);
            await Pathway.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting pathway:', err);
            res.status(500).json({ message: 'Server error deleting pathway' });
        }
    });

    // Get the state (cards and items) for a specific pathway
    app.get('/api/pathways/:id/state', ensureAuth, async (req, res) => {
        try {
            const pathway = await Pathway.findById(req.params.id).select('cards');
            if (!pathway) {
                return res.status(404).json({ message: 'Pathway not found' });
            }
            res.json(pathway.cards || []); // Return cards array or empty array
        } catch (err) {
            console.error('Error fetching pathway state:', err);
            res.status(500).json({ message: 'Server error fetching pathway state' });
        }
    });

    // Update the state (cards and items) for a specific pathway (Admin only)
    app.put('/api/pathways/:id/state', ensureAuth, ensureAdmin, async (req, res) => {
        try {
            const pathwayId = req.params.id;
            const { cards } = req.body; // Expecting an array of cards

            // Basic validation
            if (!Array.isArray(cards)) {
                return res.status(400).json({ message: 'Invalid data format: cards must be an array' });
            }

            console.log(`Admin ${req.user.email} updating state for pathway ${pathwayId}`);
            
            const updatedPathway = await Pathway.findByIdAndUpdate(
                pathwayId,
                { $set: { cards: cards } }, // Use $set to replace the entire cards array
                { new: true, runValidators: true } // Return updated doc, run schema validation
            );

            if (!updatedPathway) {
                return res.status(404).json({ message: 'Pathway not found' });
            }

            res.json({ success: true, cards: updatedPathway.cards });
        } catch (err) {
            console.error('Error updating pathway state:', err);
            // Provide more specific error messages if possible (e.g., validation errors)
            if (err.name === 'ValidationError') {
                return res.status(400).json({ message: `Validation Error: ${err.message}` });
            }
            res.status(500).json({ message: 'Server error updating pathway state' });
        }
    });

    // Diagnostic endpoint to check database synchronization status
    app.get('/api/diagnostics', ensureAuth, async (req, res) => {
        try {
            const pathwayCount = await Pathway.countDocuments();
            const pathways = await Pathway.find();
            const pathwayNames = pathways.map(p => p.name);
            
            // Count default pathways from the array
            const defaultCount = defaultPathways.length;
            const defaultNames = defaultPathways.map(p => p.name);
            
            // Find pathways that are in defaultPathways but not in the database
            const missingPathways = defaultPathways.filter(dp => 
                !pathwayNames.includes(dp.name)
            );
            
            // Find pathways that are in the database but not in defaultPathways
            const extraPathways = pathways.filter(p => 
                !defaultNames.includes(p.name)
            );
            
            const syncStatus = missingPathways.length === 0 
                ? "Database is in sync with code" 
                : "Database is missing pathways defined in code";
            
            res.json({
                status: syncStatus,
                pathwaysInDb: pathwayCount,
                defaultPathways: defaultCount,
                missing: missingPathways.length,
                missingDetails: missingPathways.length > 0 ? missingPathways : undefined,
                extra: extraPathways.length,
                extraDetails: extraPathways.length > 0 ? extraPathways : undefined
            });
        } catch (err) {
            console.error('Error in diagnostics:', err);
            res.status(500).json({ message: 'Server error in diagnostics' });
        }
    });
} else {
    // Provide fallback for DB routes
    app.get('/api/pathways', (req, res) => {
        res.status(503).json({ message: 'Database is disabled in this deployment.' });
    });
    // ... (repeat for all other DB routes)
}

// --- Per-user pathway progress endpoints ---
app.get('/api/user/progress/:pathwayId', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const progress = (user.pathwayProgress || []).find(p => p.pathway.toString() === req.params.pathwayId);
        res.json({ success: true, progress: progress || null });
    } catch (err) {
        console.error('Error fetching user progress:', err);
        res.status(500).json({ success: false, message: 'Server error fetching progress' });
    }
});

app.put('/api/user/progress/:pathwayId', ensureAuth, async (req, res) => {
    try {
        const { cards } = req.body;
        if (!Array.isArray(cards)) return res.status(400).json({ success: false, message: 'Cards must be an array' });
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const pathwayId = req.params.pathwayId;
        let found = false;
        if (!user.pathwayProgress) user.pathwayProgress = [];
        user.pathwayProgress = user.pathwayProgress.filter(p => {
            if (p.pathway.toString() === pathwayId) {
                found = true;
                return false; // Remove old entry
            }
            return true;
        });
        user.pathwayProgress.push({ pathway: pathwayId, cards });
        await user.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving user progress:', err);
        res.status(500).json({ success: false, message: 'Server error saving progress' });
    }
});
// --- End per-user pathway progress endpoints ---

// --- Start Server ---
const startServer = async () => {
    try {
        console.log('Starting server...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Session Secret Loaded:', !!process.env.SESSION_SECRET);
        console.log('MongoDB URL:', ENABLE_MONGODB ? MONGODB_URL : 'DISABLED');
        console.log('Google Client ID Loaded:', !!process.env.GOOGLE_CLIENT_ID);
        console.log('Google Client Secret Loaded:', !!process.env.GOOGLE_CLIENT_SECRET);
        console.log('Google Callback URL:', process.env.GOOGLE_CALLBACK_URL);
        
        if (ENABLE_MONGODB && connectDB) {
            await connectDB();
        }
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`MongoDB URL: ${ENABLE_MONGODB ? MONGODB_URL : 'DISABLED'}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        console.error('Error details:', err);
        process.exit(1);
    }
};

startServer();
