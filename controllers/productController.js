const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/image/product");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "image-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const resizeAndCrop = async (file) => {
  const resizedFilename =
    "resized-" + Date.now() + path.extname(file.originalname);

  await sharp(file.path)
    .resize({ width: 100, height: 100, fit: "inside" })
    .toFile("public/image/product/" + resizedFilename);

  return resizedFilename;
};

const getAllCategories = async () => {
  try {
    const categories = await Category.find({ isDeleted: false });
    return categories;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  allProductsPage: async (req, res) => {
    try {
      const products = await Product.find().populate("category");
      const { success, error } = req.flash();

      res.render("admin/allProducts", {
        products,
        messages: { success, error },
      });
    } catch (error) {
      req.flash("error", "Server Error");
      return res.redirect("/admin/home");
    }
  },

  addproductpage: async (req, res) => {
    try {
      const categories = await getAllCategories();
      res.render("admin/addproduct", { categories, messages: req.flash() });
    } catch (error) {
      req.flash("error", "Error in add product");
      return res.redirect("/admin/products");
    }
  },

  addProduct: (req, res) => {
    upload.array("image")(req, res, async (err) => {
      try {
        if (err) {
          req.flash("error", "Failed to upload images");
          return res.redirect("/admin/products/addproduct");
        }

        const { name, description, price, category, stock } = req.body;
        const images = [];

        const nameValidate = /^(?!\s+$)[a-zA-Z0-9\s]{3,20}$/;
        const descriptionValidate = /^(?!\s{0,150}$).{10,150}$/;
        const priceValidate = /^\d+(\.\d{1,2})?$/;
        const stockValidate = /^[1-9]\d*$/;

        if (!nameValidate.test(name)) {
          req.flash("error", "Invalid product name");
          return res.redirect("/admin/products/addproduct");
        }

        if (!descriptionValidate.test(description)) {
          req.flash("error", "Invalid description");
          return res.redirect("/admin/products/addproduct");
        }

        if (!priceValidate.test(price) || parseFloat(price) <= 0) {
          req.flash("error", "Invalid price");
          return res.redirect("/admin/products/addproduct");
        }

        if (!stockValidate.test(stock)) {
          req.flash("error", "Invalid stock");
          return res.redirect("/admin/products/addproduct");
        }

        for (const file of req.files) {
          const allowedExtensions = ["jpg", "jpeg", "png", "svg"];
          const fileExtension = file.originalname
            .split(".")
            .pop()
            .toLowerCase();

          if (!allowedExtensions.includes(fileExtension)) {
            req.flash(
              "error",
              "Only JPG, JPEG, PNG, or SVG images are allowed"
            );
            return res.redirect("/admin/products/addproduct");
          }

          const resizedFilename = await resizeAndCrop(file);
          images.push(resizedFilename);
        }

        const newProduct = new Product({
          name,
          description,
          price,
          image: images,
          category,
          stock,
        });

        await newProduct.save();

        req.flash("success", "Product added successfully");
        res.redirect("/admin/products");
      } catch (error) {
        req.flash("error", "Failed to add product");
        res.redirect("/admin/products");
      }
    });
  },

  editProductPage: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      const categories = await getAllCategories();
      res.render("admin/editProduct", {
        product,
        categories,
        messages: req.flash(),
      });
    } catch (error) {
      req.flash("error", "Failed to get edit product");
      res.redirect("/admin/products");
    }
  },

  editProduct: async (req, res) => {
    upload.array("image")(req, res, async (err) => {
      try {
        if (err) {
          req.flash("error", "Failed to upload images");
          return res.redirect("/admin/products/editproduct");
        }
        const { name, category, price, description, stock } = req.body;

        const nameValidate = /^(?!\s+$)[a-zA-Z0-9\s]{3,20}$/;
        const descriptionValidate = /^(?!\s{0,150}$).{10,150}$/;
        const priceValidate = /^\d+(\.\d{1,2})?$/;
        const stockValidate = /^[0-9]\d*$/;

        if (!nameValidate.test(name)) {
          req.flash("error", "Invalid product name");
          return res.redirect(`/admin/products/editproduct/${req.params.id}`);
        }

        if (!descriptionValidate.test(description)) {
          req.flash("error", "Invalid description");
          return res.redirect(`/admin/products/editproduct/${req.params.id}`);
        }

        if (!priceValidate.test(price) || parseFloat(price) <= 0) {
          req.flash("error", "Invalid price");
          return res.redirect(`/admin/products/editproduct/${req.params.id}`);
        }

        if (!stockValidate.test(stock)) {
          req.flash("error", "Invalid stock");
          return res.redirect(`/admin/products/editproduct/${req.params.id}`);
        }

        for (const file of req.files) {
          const allowedExtensions = ["jpg", "jpeg", "png", "svg"];
          const fileExtension = file.originalname
            .split(".")
            .pop()
            .toLowerCase();

          if (!allowedExtensions.includes(fileExtension)) {
            req.flash(
              "error",
              "Only JPG, JPEG, PNG, or SVG images are allowed"
            );
            return res.redirect(`/admin/products/editproduct/${req.params.id}`);
          }
        }

        const productId = req.params.id;
        const newImages = req.files.map((file) => file.filename);

        const product = await Product.findById(productId);

        const existingImages = product.image;
        const updatedImages = existingImages.filter(
          (image) => !req.body[`removeImage_${image}`]
        );

        updatedImages.push(...newImages);

        product.name = name;
        product.category = category;
        product.price = price;
        product.description = description;
        product.stock = stock;
        product.image = updatedImages;

        const updatedProduct = await product.save();

        if (!updatedProduct) {
          req.flash("error", "Product not found");
          return res.redirect("/admin/products");
        }

        for (const file of req.files) {
          await sharp(file.path)
            .resize({ width: 100, height: 100, fit: "inside" })
            .toFile(`public/image/product/resized-${file.filename}`);
        }

        req.flash("success", "Product updated successfully");
        res.redirect("/admin/products");
      } catch (error) {
        req.flash("error", "Failed to update product");
        res.redirect("/admin/products");
      }
    });
  },

  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;

      const product = await Product.findByIdAndUpdate(
        productId,
        { isDeleted: true },
        { new: true }
      );

      if (!product) {
        req.flash("error", "Product not found");
        return res.redirect("/admin/products");
      }

      req.flash("success", "Product deleted successfully");
      res.redirect("/admin/products");
    } catch (error) {
      req.flash("error", "Failed to delete product");
      res.redirect("/admin/products");
    }
  },
};
