const Category = require("../models/categoryModel");

module.exports = {
  allCategoriesPage: async (req, res) => {
    try {
      const categories = await Category.find({ isDeleted: false });
      const { success, error } = req.flash();

      res.render("admin/allCategories", {
        categories,
        messages: { success, error },
      });
    } catch (error) {
      req.flash("error", "Server Error");
      return res.redirect("/admin/home");
    }
  },

  addCategoryPage: (req, res) => {
    try {
      res.render("admin/addCategory", { messages: req.flash() });
    } catch (error) {
      req.flash("error", "Failed to render addCategory page");
      res.redirect("/admin/categories");
    }
  },

  addCategory: async (req, res) => {
    try {
      const { name } = req.body;

      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingCategory) {
        req.flash("error", "Category already exists");
        return res.redirect("/admin/categories/addcategory");
      }

      const nameValidate = /^[a-zA-Z]{1,15}$/;
      if (!nameValidate.test(name)) {
        req.flash(
          "error",
          "Invalid category name. Only letters allowed, maximum 15 characters."
        );
        return res.redirect("/admin/categories/addcategory");
      }

      const newCategory = new Category({ name });
      await newCategory.save();
      req.flash("success", "Category added succcessfully");
      res.redirect("/admin/categories");
    } catch (error) {
      req.flash("error", "Failed to add category");
      res.redirect("/admin/categories");
    }
  },

  editCategoryPage: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      res.render("admin/editCategory", { category, messages: req.flash() });
    } catch (error) {
      req.flash("error", "Failed to get edit category page");
      res.redirect("/admin/categories");
    }
  },

  editCategory: async (req, res) => {
    try {
      const categoryId = req.params.id;
      const { name } = req.body;
      const nameValidate = /^[a-zA-Z]{1,15}$/;

      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: categoryId },
      });

      if (existingCategory) {
        req.flash("error", "Category name already exists");
        return res.redirect(`/admin/categories/editcategory/${categoryId}`);
      }

      if (!nameValidate.test(name)) {
        req.flash(
          "error",
          "Invalid category name. Only letters allowed, maximum 15 characters."
        );
        return res.redirect(`/admin/categories/editcategory/${categoryId}`);
      }

      await Category.findByIdAndUpdate(categoryId, { name });
      req.flash("success", "Category updated successfully");
      res.redirect("/admin/categories");
    } catch (error) {
      req.flash("error", "Failed to update category");
      res.redirect("/admin/categories");
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const categoryId = req.params.id;

      const category = await Category.findByIdAndUpdate(
        categoryId,
        { isDeleted: true },
        { new: true }
      );

      if (!category) {
        console.log("Category not found:", categoryId);
        req.flash("error", "Category not found");
        return res.redirect("/admin/categories");
      }

      req.flash("success", "Category deleted successfully");
      res.redirect("/admin/categories");
    } catch (error) {
      req.flash("error", "Failed to delete category");
      res.redirect("/admin/categories");
    }
  },
};
