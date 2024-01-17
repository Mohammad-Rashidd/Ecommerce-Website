const Product = require("../models/productModel");
const UserModel = require("../models/userModel");
const Category = require("../models/categoryModel");

const mongoose = require("mongoose");

module.exports = {
  getSearchedProducts: async (req, res) => {
    try {
      let Products = await Product.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
      ]);

      let query = req.query.search;

      if (query) {
        Products = Products.filter((product) => {
          query = query.toLowerCase().replace(/\s/g, "");

          const name = product.product_name.toLowerCase().replace(/\s/g, "");
          if (name.includes(query)) {
            return true;
          } else if (query.includes(name)) {
            return true;
          }

          const category = product.category.name
            .toLowerCase()
            .replace(/\s/g, "");
          if (category.includes(query)) {
            return true;
          } else if (query.includes(category)) {
            return true;
          }
        });
      }

      let category = req.query.category;
      if (category) {
        Products = Products.filter((product) => {
          return category.includes(product.category.name);
        });
      }

      const sortQuery = req.query.sort;
      if (sortQuery === "low-high") {
        Products.sort((a, b) => {
          const sellingPriceA = parseFloat(a.price);
          const sellingPriceB = parseFloat(b.price);

          if (sellingPriceA < sellingPriceB) {
            return -1;
          } else if (sellingPriceA > sellingPriceB) {
            return 1;
          } else {
            return 0;
          }
        });
      } else if (sortQuery === "high-low") {
        Products.sort((a, b) => {
          const sellingPriceA = parseFloat(a.price);
          const sellingPriceB = parseFloat(b.price);

          if (sellingPriceA < sellingPriceB) {
            return 1;
          } else if (sellingPriceA > sellingPriceB) {
            return -1;
          } else {
            return 0;
          }
        });
      } else if (sortQuery === "new-first") {
        Products.sort((a, b) => {
          const createdAtA = new Date(a.createdAt);
          const createdAtB = new Date(b.createdAt);

          if (createdAtA > createdAtB) {
            return -1;
          } else if (createdAtA < createdAtB) {
            return 1;
          }
        });
      }

      const userId = req.session.user_id;
      const userData = await UserModel.findById(userId);
      let cartCount;
      if (userData) {
        cartCount = userData.cart.length;
      }
      const user_id = userData._id;
      for (const product of Products) {
        const product_id = product._id;
        const user = await UserModel.findOne({
          _id: user_id,
          "wishlist.product_id": product_id,
        });

        if (user) {
          product.wish = false;
        } else {
          product.wish = true;
        }
      }

      const categories = await Category.find({ isDeleted: false });
      res.render("user/products", { categories, cartCount, Products });
    } catch (error) {
      req.flash("error", "Failed to fetch searched products");
      res.redirect("/");
    }
  },

  searchProduct: async (req, res) => {
    try {
      const allProducts = await Product.find({ isDeleted: false });
      const searchQuery = req.query.query.toLowerCase();
      const searchResults = allProducts.filter((product) =>
        product.name.toLowerCase().includes(searchQuery)
      );
      res.json(searchResults);
    } catch (error) {
      res.json({ error: "Failed to fetch search results" });
    }
  },
};
