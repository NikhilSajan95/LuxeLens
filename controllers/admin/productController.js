const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel'); 
const Brand = require('../../models/brandModel');
const path = require('path');



function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


const parseAndProcessVariants = async (body) => {
    const variantsFromForm = body.variants || [];
    const finalVariants = [];
    for (const variant of variantsFromForm) {
        let imagesToKeep = variant.existing_images || [];
        if (typeof imagesToKeep === 'string') {
            imagesToKeep = [imagesToKeep];
        }
        const newlyUploadedFiles = variant.images || [];
        const newlyUploadedPaths = newlyUploadedFiles.map(file => file.path);
        const allImagesForThisVariant = [...imagesToKeep, ...newlyUploadedPaths];
        
        if (variant.color && Array.isArray(variant.sizes) && Array.isArray(variant.quantities)) {
            variant.sizes.forEach((size, sizeIndex) => {
                const quantity = variant.quantities[sizeIndex];
                if (size && size.trim() !== '' && quantity !== undefined) {
                    finalVariants.push({
                        color: variant.color.trim(),
                        size: size.trim(),
                        quantity: quantity,
                        images: allImagesForThisVariant
                    });
                }
            });
        }
    }
    return finalVariants;
};

const productController = {
  getProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 3;
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const query = {
        isDeleted: false,
        title: { $regex: search, $options: 'i' }
      };
      const total = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)   
        .limit(limit)
        .populate('category_id', 'name')
        .populate('brand_id', 'name')
        .lean();
      const categories = await Category.find({ isDeleted: false });
      const brands = await Brand.find({ isDeleted: false });
      
      res.render('admin/products', {
        title: 'Product Management',
        products,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        search,
        categories,
        brands
      });
    } catch (err) {
      console.error('Error loading products:', err);
  
      req.flash('error', 'Error loading products.');
      res.redirect('/admin/dashboard'); 
    }
  },

  getProductById: async (id) => {
    try {
      const product = await Product.findById(id)
        .populate('category_id', 'name')
        .populate('brand_id', 'name')
        .lean();
      return product;
    } catch (err) {
      console.error('Error fetching product by ID:', err);
      throw err;
    }
  },
  getCategories: async () => {
    try {
      const categories = await Category.find({ isDeleted: false });
      return categories;
    } catch (err) {
      console.error('Error fetching categories:', err);
      throw err;
    }
  },
  getBrands: async () => {
    try {
      const brands = await Brand.find({ isDeleted: false });
      return brands;
    } catch (err) {
      console.error('Error fetching brands:', err);
      throw err;
    }
  },
  getProductForEdit: async (req, res) => {
    try {
      const product = await productController.getProductById(req.params.id);
      if (!product) return res.status(404).send('Product not found');
      const categories = await productController.getCategories();
      const brands = await productController.getBrands();
      res.render('admin/products', {
        title: 'Edit Product',
        product: JSON.parse(JSON.stringify(product)),
        categories,
        brands,
        currentPage: 1,
        totalPages: 1,
        search: '',
        editProductId: product._id
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).send('Error fetching product');
    }
  },

  addProduct: async (req, res) => {
        try {
            const { category_id, brand_id, title, stock_status, description, regular_price, offer_price, warranty } = req.body;
            
            const titleToFind = req.body.title.trim();
            const escapedTitle = escapeRegExp(titleToFind);
            const existingProduct = await Product.findOne({ 
                title: { $regex: new RegExp('^' + escapedTitle + '$', 'i') },
                isDeleted: false
            });
            
            if (existingProduct) {
       
                return res.status(400).json({ 
                    success: false, 
                    message: 'A product with this title already exists.' 
                });
            }
            
            const processedVariants = await parseAndProcessVariants(req.body);

            await Product.create({
                category_id, brand_id, title, stock_status, description, 
                regular_price, offer_price, warranty, 
                variants: processedVariants
            });

            
            return res.status(201).json({ 
                success: true, 
                message: 'Product added successfully!' 
            });

        } catch (err) {
            console.error('Error adding product:', err);
           
            return res.status(500).json({ 
                success: false, 
                message: 'Server error. Please try again.' 
            });
        }
    },

    
    editProduct: async (req, res) => {
        try {
            const { category_id, brand_id, title, stock_status, description, regular_price, offer_price, warranty } = req.body;

            const titleToFind = req.body.title.trim();
            const escapedTitle = escapeRegExp(titleToFind);
            const existingProduct = await Product.findOne({ 
                title: { $regex: new RegExp('^' + escapedTitle + '$', 'i') },
                _id: { $ne: req.params.id },
                isDeleted: false
            });

            if (existingProduct) {
        
                return res.status(400).json({ 
                    success: false, 
                    message: 'Another product with this title already exists.' 
                });
            }
            
            const product = await Product.findById(req.params.id);
            if (!product) {
                
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found.' 
                });
            }

            const processedVariants = await parseAndProcessVariants(req.body);
            
            await Product.findByIdAndUpdate(req.params.id, {
                category_id, brand_id, title, stock_status, description, 
                regular_price, offer_price, warranty, 
                variants: processedVariants.length > 0 ? processedVariants : product.variants
            });

          
            return res.status(200).json({ 
                success: true, 
                message: 'Product updated successfully!' 
            });
            
        } catch (err) {
            console.error('Error editing product:', err);
        
            return res.status(500).json({ 
                success: false, 
                message: 'Server error. Please try again.' 
            });
        }
    },

    toggleProductStatus: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found.' });
            }
            
            product.isListed = !product.isListed;
            await product.save();
            
            const message = product.isListed ? 'Product listed successfully.' : 'Product unlisted successfully.';
            return res.status(200).json({ success: true, message: message, isListed: product.isListed });
            
        } catch (err) {
            console.error('Error toggling product status:', err);
            return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
        }
    },
    
   
    softDeleteProduct: async (req, res) => {
        try {
            await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
        
            return res.status(200).json({ 
                success: true, 
                message: 'Product deleted successfully.' 
            });
        } catch (err) {
            console.error('Error deleting product:', err);
          
            return res.status(500).json({ 
                success: false, 
                message: 'Error deleting product. Please try again.' 
            });
        }
    }
};

module.exports = productController;