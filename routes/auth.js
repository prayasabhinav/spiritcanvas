const express = require('express');
const passport = require('passport');
const router = express.Router();

// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to dashboard or homepage
    res.redirect('/');
  }
);

// @desc    Login page
// @route   GET /auth/login
router.get('/login', (req, res) => {
  res.render('login', {
    layout: 'login',
  });
});

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// @desc    Check authentication status
// @route   GET /auth/status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    // Return user information if authenticated
    res.json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        displayName: req.user.displayName,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        image: req.user.image
      }
    });
  } else {
    // Return not authenticated if user is not logged in
    res.json({
      isAuthenticated: false
    });
  }
});

module.exports = router;
