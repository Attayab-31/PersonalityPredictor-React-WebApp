const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;  // Import the Facebook Strategy
const User = require('../models/User');

// Google Strategy (unchanged)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://personalitypredictor-react-webapp-2.onrender.com/api/auth/google/callback",
    proxy: true
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ 
        $or: [
          { email: profile.emails[0].value },
          { googleId: profile.id }
        ]
      });
      
      if (!user) {
        const randomPassword = Math.random().toString(36).slice(-8);
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: randomPassword,
          googleId: profile.id,
          profilePic: profile.photos?.[0]?.value || ''
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        if (!user.profilePic && profile.photos?.[0]?.value) {
          user.profilePic = profile.photos[0].value;
        }
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Facebook Strategy (new addition)
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://personalitypredictor-react-webapp-2.onrender.com/api/auth/facebook/callback", // Same as your Google callback, just change the URL
    profileFields: ['id', 'displayName', 'email', 'photos'] // Fields you want to retrieve from Facebook
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      // Check if the user already exists by email or Facebook ID
      let user = await User.findOne({ 
        $or: [
          { email: profile.emails[0].value },
          { facebookId: profile.id }
        ]
      });
      
      if (!user) {
        // Create a new user if one doesn't exist
        const randomPassword = Math.random().toString(36).slice(-8); // Generate a random password
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: randomPassword, // Since Facebook authentication doesn't require a password
          facebookId: profile.id,
          profilePic: profile.photos?.[0]?.value || ''
        });
      } else if (!user.facebookId) {
        // If user exists but doesn't have Facebook ID (signed up with email), link accounts
        user.facebookId = profile.id;
        if (!user.profilePic && profile.photos?.[0]?.value) {
          user.profilePic = profile.photos[0].value;
        }
        await user.save();
      }

      return done(null, user);  // Successfully authenticated
    } catch (error) {
      return done(error, null);  // Error handling
    }
  }
));

// Serialize and deserialize for session handling (unchanged)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
