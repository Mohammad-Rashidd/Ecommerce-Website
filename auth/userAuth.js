const UserModel = require("../models/userModel");

const isLoggedIn = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      req.flash("error", "Login required to access this page");
      return res.redirect("/login");
    }

    const user = await UserModel.findById(userId);
    if (!user || user.blocked) {
      req.session.user_id = null;
      req.flash("error", "Your account is blocked or does not exist");
      return res.redirect("/login");
    }

    next();
  } catch (error) {
    console.error(error.message);
    req.flash("error", "Server Error");
    res.redirect("/login");
  }
};

const isLoggedOut = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      return res.redirect("/userhome");
    }
    next();
  } catch (error) {
    console.error(error.message);
  }
};

module.exports = {
  isLoggedIn,
  isLoggedOut,
};
