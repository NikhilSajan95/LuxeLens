const Category = require('../../models/categoryModel');


function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const categoryController = {
  getCategories: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 2;
      const search = req.query.search || '';

      const query = {
        isDeleted: false,
        name: { $regex: search, $options: 'i' }
      };

      const total = await Category.countDocuments(query);
      const categories = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.render('admin/categories', {
        title: 'Category Management',
        categories,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        search
      });
    } catch (err) {
      console.error('Error loading categories:', err);
      req.flash('error', 'Error loading categories.');
      res.redirect('/admin/dashboard');
    }
  },

  addCategory: async (req, res) => {
    try {
      const { name } = req.body;


      const trimmedName = name.trim();
      const escapedName = escapeRegExp(trimmedName);
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp('^' + escapedName + '$', 'i') },
        isDeleted: false 
      });

      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'A category with this name already exists.' });
      }

      await Category.create({ name: trimmedName });
      return res.status(201).json({ success: true, message: 'Category added successfully!' });

    } catch (err) {
      console.error('Error adding category:', err);
      return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
  },


  editCategory: async (req, res) => {
    try {
      const { name } = req.body;
      const categoryId = req.params.id;

    
      const trimmedName = name.trim();
      const escapedName = escapeRegExp(trimmedName); 
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp('^' + escapedName + '$', 'i') },
        _id: { $ne: categoryId }, 
        isDeleted: false
      });

      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'Another category with this name already exists.' });
      }

      await Category.findByIdAndUpdate(categoryId, { name: trimmedName });
      
      return res.status(200).json({ success: true, message: 'Category updated successfully!' });

    } catch (err) {
      console.error('Error editing category:', err);
      return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
  },

  softDeleteCategory: async (req, res) => {
    try {
      await Category.findByIdAndUpdate(req.params.id, { isDeleted: true });
      return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    } catch (err) {
      console.error('Error deleting category:', err);
      return res.status(500).json({ success: false, message: 'Error deleting category.' });
    }
  },

  toggleCategoryList: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }

      category.isListed = !category.isListed;
      await category.save();

      const message = category.isListed ? 'Category listed.' : 'Category unlisted.';
      return res.status(200).json({ success: true, message: message });
    } catch (err) {
      console.error('Error toggling category list status:', err);
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
};

module.exports = categoryController;