const fs = require('fs');
const path = require('path');

// Function to check if a user is an admin
const isAdmin = (email) => {
    if (!email) {
        console.error('No email provided for admin check');
        return false;
    }

    try {
        const adminsPath = path.join(__dirname, '..', 'admins.txt');
        const adminEmails = fs.readFileSync(adminsPath, 'utf8')
            .split('\n')
            .map(line => line.trim().toLowerCase()) // Convert to lowercase for case-insensitive comparison
            .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
        
        return adminEmails.includes(email.toLowerCase());
    } catch (err) {
        console.error('Error checking admin status:', err);
        return false;
    }
};

// Middleware to ensure user is an admin
const ensureAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log('User not authenticated');
        return res.status(401).json({ message: 'Please log in first' });
    }

    if (!req.user || !req.user.email) {
        console.log('User object or email missing:', req.user);
        return res.status(403).json({ message: 'User information not available' });
    }

    const userEmail = req.user.email;
    console.log('Checking admin status for email:', userEmail);
    
    if (!isAdmin(userEmail)) {
        console.log('User is not an admin:', userEmail);
        return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('User is an admin:', userEmail);
    next();
};

module.exports = { ensureAdmin, isAdmin }; 