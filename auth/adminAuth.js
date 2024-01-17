const isLoggedIn = async (req, res, next) => {
  try {
    if (req.session.isAdminLoggedIn) {
      next();
    } else {
      req.flash("error", "Login required to access this page");
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.log(error.message);
    req.flash("error", "Server Error");
    res.redirect("/admin/login");
  }
};

const isLoggedOut = async (req, res, next) => {
  try {
    if (req.session.isAdminLoggedIn) {
      res.redirect("/admin/dash");
    } else {
      next();
    }
  } catch (error) {
    console.log(error.message);
    req.flash("error", "Server Error");
    res.redirect("/admin/dash");
  }
};

module.exports = {
  isLoggedIn,
  isLoggedOut,
};
