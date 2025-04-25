/**
 * Authentication middleware functions for route protection
 */

module.exports = {
  // Ensure user is authenticated
  ensureAuth: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect('/auth/login');
    }
  },

  // Ensure guest (not authenticated)
  ensureGuest: function (req, res, next) {
    if (req.isAuthenticated()) {
      res.redirect('/dashboard');
    } else {
      return next();
    }
  }
};
