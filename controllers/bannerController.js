const Banner = require("../models/bannerModel");
const fs = require("fs");

module.exports = {
  renderBannerPage: async (req, res) => {
    try {
      const banners = await Banner.find();
      res.render("banner/banner", { banners });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  renderNewBannerPage: async (req, res) => {
    try {
      res.render("banner/newBanner");
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  createNewBanner: async (req, res) => {
    try {
      const banner = new Banner({
        banner_name: req.body.banner_name,
        reference: req.body.reference,
        image: {
          filename: req.files.banner_image[0].filename,
          originalname: req.files.banner_image[0].originalname,
          path: req.files.banner_image[0].path,
        },
      });

      const create_banner = await banner.save();

      if (create_banner) {
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },

  renderEditBanner: async (req, res) => {
    try {
      const banner = await Banner.findById(req.params.id);
      res.render("banner/editBanner", { banner });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  updateBanner: async (req, res) => {
    try {
      const { banner_name, reference, status, imageName } = req.body;
      let edit_banner = {
        banner_name: banner_name,
        reference: reference,
        banner_status: status === "true" ? true : false,
      };
      if (req.files) {
        edit_banner.image = {
          filename: req.files.banner_image[0].filename,
          originalname: req.files.banner_image[0].originalname,
          path: req.files.banner_image[0].path,
        };

        fs.unlink(`./public/banners/${imageName}`, (err) => {
          if (err) {
            throw err;
          }
        });
      }

      const id = req.params.id;
      const update_banner = await Banner.findByIdAndUpdate(
        { _id: id },
        edit_banner,
        { new: true }
      );

      if (update_banner) {
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },

  deleteBanner: async (req, res) => {
    try {
      const id = req.query.id;
      const image = req.query.image;

      fs.unlink(`./public/banners/${image}`, (err) => {
        if (err) {
          throw err;
        }
      });

      const delete_banner = await Banner.findByIdAndDelete({ _id: id });
      if (delete_banner) {
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },
};
