const express = require("express");
const router = express.Router();
const customerController = require("../../controllers/admin/customerController");
const categoryController = require("../../controllers/admin/categoryController");
const brandController = require("../../controllers/admin/brandController");
const productController = require("../../controllers/admin/productController");
const dashboardController = require("../../controllers/admin/dashboardController");
const { upload } = require("../../config/cloudinary");
const validate = require("../../middlewares/validate");
const { productSchema } = require("../../utils/validationSchemas");
const authController = require("../../controllers/admin/authController");
const { isAdmin } = require("../../middlewares/authmiddleware");

// auth
router.get("/login", authController.getLogin);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/dashboard", isAdmin, authController.getDashboard);

// Customer routes
router.get("/customers", isAdmin, customerController.getCustomers);
router.patch(
  "/customers/:id",
  isAdmin,
  customerController.toggleBlockUser,
);

// Category routes
router.get("/categories", isAdmin, categoryController.getCategories);
router.post("/categories", isAdmin, categoryController.addCategory);
router.put("/categories/:id", isAdmin, categoryController.editCategory);
router.delete(
  "/categories/:id",
  isAdmin,
  categoryController.softDeleteCategory,
);
router.patch(
  "/categories/:id",
  isAdmin,
  categoryController.toggleCategoryList,
);

// Brand routes
router.get("/brands", isAdmin, brandController.getBrands);
router.post(
  "/brands/add",
  isAdmin,
  upload.single("image"),
  brandController.addBrand,
);
router.put(
  "/brands/edit/:id",
  isAdmin,
  upload.single("image"),
  brandController.editBrand,
);
router.patch("/brands/delete/:id", isAdmin, brandController.softDeleteBrand);
router.patch("/brands/toggle/:id", isAdmin, brandController.toggleBrandStatus);

// Product routes
router.get("/products", isAdmin, productController.getProducts);
router.get("/products/edit/:id", isAdmin, productController.getProductForEdit);
router.post(
  "/products/add",
  isAdmin,
  upload.any(),
  validate(productSchema),
  productController.addProduct,
);
router.put(
  "/products/:id",
  isAdmin,
  upload.any(),
  validate(productSchema),
  productController.editProduct,
);
router.patch(
  "/products/:id",
  isAdmin,
  productController.toggleProductStatus,
);
router.delete(
  "/products/:id",
  isAdmin,
  productController.softDeleteProduct,
);

router.get("/dashboard", dashboardController.getDashboard);

module.exports = router;
