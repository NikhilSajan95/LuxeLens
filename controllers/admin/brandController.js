const Brand = require("../../models/brandModel");
const path = require("path");
const { z } = require('zod');


const brandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Brand name must be at least 2 characters")
    .max(10, "Brand name must not exceed 10 characters"),

  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(200, "Description must not exceed 200 characters")
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const brandController = {
  getBrands: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const search = req.query.search || "";

      const query = {
        isDeleted: false,
        name: { $regex: search, $options: "i" },
      };

      const total = await Brand.countDocuments(query);
      const brands = await Brand.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.render("admin/brands", {
        title: "Brand Management",
        brands,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        search,
      });
    } catch (err) {
      console.error("Error loading brands:", err);
      req.flash('error', 'Error loading brands.');
      res.redirect('/admin/dashboard');
    }
  },

  addBrand: async (req, res) => {
  try {

    const validation = brandSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0].message
      });
    }

    const { name, description } = validation.data;

    const escapedName = escapeRegExp(name);

    const existingBrand = await Brand.findOne({
      name: { $regex: new RegExp('^' + escapedName + '$', 'i') },
      isDeleted: false
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'A brand with this name already exists.'
      });
    }

    let imagePath = null;

    if (req.file) {
      imagePath = req.file.path;
    }

    await Brand.create({
      name,
      description,
      image: imagePath
    });

    return res.status(201).json({
      success: true,
      message: 'Brand added successfully!'
    });

  } catch (err) {

    console.error("Error adding brand:", err);

    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
},


  editBrand: async (req, res) => {
  try {

    const validation = brandSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0].message
      });
    }

    const { name, description } = validation.data;

    const brandId = req.params.id;

    const escapedName = escapeRegExp(name);

    const existingBrand = await Brand.findOne({
      name: { $regex: new RegExp('^' + escapedName + '$', 'i') },
      _id: { $ne: brandId },
      isDeleted: false
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Another brand with this name already exists.'
      });
    }

    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    brand.name = name;
    brand.description = description;

    if (req.file) {
      brand.image = req.file.path;
    }

    await brand.save();

    return res.status(200).json({
      success: true,
      message: 'Brand updated successfully!'
    });

  } catch (err) {

    console.error("Error editing brand:", err);

    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
},

 
  softDeleteBrand: async (req, res) => {
    try {
      await Brand.findByIdAndUpdate(req.params.id, { 
        isDeleted: true,
        isActive: false 
      });
      return res.status(200).json({ success: true, message: 'Brand deleted successfully.' });
    } catch (err) {
      console.error('Error deleting brand:', err);
      return res.status(500).json({ success: false, message: 'Error deleting brand.' });
    }
  },


  toggleBrandStatus: async (req, res) => {
    try {
      const brand = await Brand.findById(req.params.id);
      if (!brand) {
        return res.status(404).json({ success: false, message: 'Brand not found.' });
      }

      brand.isActive = !brand.isActive; 
      await brand.save();

      const message = brand.isActive ? 'Brand activated.' : 'Brand deactivated.';
      return res.status(200).json({ success: true, message: message });
    } catch (err) {
      console.error('Error toggling brand status:', err);
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
};

module.exports = brandController;