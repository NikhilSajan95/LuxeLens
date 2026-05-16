const asyncHandler = require('express-async-handler')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Product = require('../../models/productModel')
const Category = require('../../models/categoryModel')
const Brand = require('../../models/brandModel')
const User = require('../../models/userModel')


function getEffectivePrice(product) {
  return product.offer_price && product.offer_price > 0 && product.offer_price < product.regular_price
    ? product.offer_price
    : product.regular_price
}

// ─── loadHome ──────────────────────────────────────────────────────────────────
const loadHome = asyncHandler(async (req, res) => {
  const rawProducts = await Product.find({ isDeleted: false, isListed: true })
    .sort({ createdAt: -1 })
    .populate('brand_id category_id')
    .lean()

  let newArrivals = rawProducts.flatMap(product =>
    product.variants
      .filter(v => v.quantity > 0)
      .map(v => ({
        productId:       product._id,
        variantId:       v._id,
        title:           product.title,
        description:     product.description,
        category:        product.category_id,
        brand:           product.brand_id,
        color:           v.color,
        size:            v.size,
        regular_price:   product.regular_price,
        effective_price: getEffectivePrice(product),
        images:          v.images,
        quantity:        v.quantity,
      }))
  ).slice(0, 4)

  const topRatedProducts = await Product.find({ isDeleted: false, isListed: true })
    .sort({ rating: -1 })
    .populate('brand_id category_id')
    .lean()

  let bestSelling = topRatedProducts.flatMap(product =>
    product.variants
      .filter(v => v.quantity > 0)
      .map(v => ({
        productId:       product._id,
        variantId:       v._id,
        title:           product.title,
        color:           v.color,
        size:            v.size,
        regular_price:   product.regular_price,
        effective_price: getEffectivePrice(product),
        images:          v.images,
        rating:          product.rating, 
      }))
  ).slice(0, 4)

  const categories = await Category.find({ isListed: true, isDeleted: false }).select('name -_id')
  const brands     = await Brand.find({ isActive: true, isDeleted: false }).select('name -_id')

  res.render('user/home', {
    layout:           'layouts/user_main',
    newArrivals,
    bestSelling,
    categories:       categories.map(c => c.name),
    brands:           brands.map(b => b.name)
  })
})

// ─── loadProfile ───────────────────────────────────────────────────────────────
const loadProfile = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login')
  }

  const user = await User.findById(req.session.user._id).lean()

  if (!user) {
    req.session.destroy()
    return res.redirect('/auth/login')
  }

  res.render('user/profile', { 
    layout: 'layouts/user_main', 
    user, 
    addresses: [] 
  })
})

// ─── logoutUser ────────────────────────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('logout error', err)
      return res
        .status(httpStatus.internal_server_error)
        .json({ success: false, message: messages.AUTH.LOGOUT_FAILED })
    }
    res.clearCookie('connect.sid')
    res.json({ success: true, message: messages.AUTH.LOGOUT_SUCCESS })
  })
})

// ─── loadProducts─────────────
const loadProducts = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 9
  const skip  = (page - 1) * limit

  const { brand, color, size, minPrice, maxPrice, category, sort, q } = req.query

 
  const allProducts = await Product.find({ isDeleted: false, isListed: true })
    .populate('brand_id', 'name isActive isDeleted')
    .populate('category_id', 'name isListed isDeleted')
    .lean()

  const allBrands = await Brand.find({ isActive: true, isDeleted: false }).select('name -_id').lean()
  const allCategories = await Category.find({ isListed: true, isDeleted: false }).select('name -_id').lean()
  const allColors = await Product.distinct('variants.color')
  const allSizes = await Product.distinct('variants.size')

  
  let variantsArray = allProducts.flatMap(product => {
   
    if (!product.brand_id || !product.brand_id.isActive || product.brand_id.isDeleted) return []
    if (!product.category_id || !product.category_id.isListed || product.category_id.isDeleted) return []

    const effective_price = getEffectivePrice(product)

    return product.variants.map(variant => ({
      productId:       product._id,
      _id:             variant._id,
      name:            product.title,
      brand:           product.brand_id.name,
      category:        product.category_id.name,
      color:           variant.color,
      size:            variant.size,
      image:           variant.images && variant.images.length > 0 ? variant.images[0] : '/images/no-image.png',
      regular_price:   product.regular_price,
      effective_price: effective_price,
      quantity:        variant.quantity,
      createdAt:       product.createdAt 
    }))
  })


  variantsArray = variantsArray.filter(v => {
   
    if (v.quantity <= 0) return false

   
    if (category && category !== 'All' && v.category !== category) return false

    
    if (brand && brand !== 'All' && v.brand !== brand) return false

    
    if (color && color !== 'All' && v.color !== color) return false

    
    if (size && size !== 'All' && v.size !== size) return false

   
    if (minPrice && Number(minPrice) > 0 && v.regular_price < Number(minPrice)) return false
    if (maxPrice && Number(maxPrice) > 0 && v.regular_price > Number(maxPrice)) return false

    
    if (q && q.trim() !== '') {
      const searchTerm = q.trim().toLowerCase()
      if (!v.name.toLowerCase().includes(searchTerm)) return false
    }

    return true
  })

  
  variantsArray.sort((a, b) => {
    if (sort === 'priceLowHigh') return a.effective_price - b.effective_price
    if (sort === 'priceHighLow') return b.effective_price - a.effective_price
    if (sort === 'nameAZ') return a.name.localeCompare(b.name)
    if (sort === 'nameZA') return b.name.localeCompare(a.name)
    
   
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

 
  const totalVariants = variantsArray.length
  const totalPages    = Math.ceil(totalVariants / limit)
  const paginatedProducts = variantsArray.slice(skip, skip + limit)

  res.render('user/product', {
    layout: 'layouts/user_main',
    products: paginatedProducts,
    currentPage:  page,
    totalPages,
    totalVariants,
    brands:       allBrands.map(b => b.name),
    colors:       allColors,
    sizes:        allSizes,
    categories:   allCategories.map(c => c.name),
    selectedFilters: buildFilters(req.query),
    query:        req.query,
    userWishlist: [],
  })
})

function buildFilters({ brand, color, size, category, minPrice, maxPrice, sort, q } = {}) {
  return {
    brand:    brand    && brand    !== 'All' ? brand    : null,
    color:    color    && color    !== 'All' ? color    : null,
    size:     size     && size     !== 'All' ? size     : null,
    category: category && category !== 'All' ? category : null,
    minPrice: minPrice || null,
    maxPrice: maxPrice || null,
    sort:     sort     || null,
    q:        q        || null,
  }
}

// ─── loadSingleProduct ────────────────────────────
const loadSingleProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id
  const variantId = req.query.variant

  const product = await Product.findOne({ _id: productId, isDeleted: false, isListed: true })
    .populate('category_id')
    .populate('brand_id')
    .lean()

  if (!product) {
    return res.status(httpStatus.not_found).render('user/404-page', { layout: false })
  }

  const activeVariants = product.variants

  if (!activeVariants || activeVariants.length === 0) {
    return res.status(httpStatus.not_found).render('user/404-page', { layout: false })
  }

  let selectedVariant =
    (variantId && activeVariants.find(v => v._id.toString() === variantId)) ||
    activeVariants.find(v => v.quantity > 0) ||
    activeVariants[0]

  const relatedProducts = await Product.find({
    category_id: product.category_id._id,
    _id:         { $ne: product._id },
    isDeleted:   false,
    isListed:    true,
    'variants.size': selectedVariant.size,
  })
    .limit(4)
    .populate('brand_id')
    .populate('category_id')
    .lean()

  res.render('user/productDetail', {
    layout: 'layouts/user_main',
    product: { ...product, variants: activeVariants },
    relatedProducts,
    selectedVariant,
    userWishlist: [], 
    effective_price: getEffectivePrice(product)
  })
})

// ─── searchProducts ────────────────────────────────────────────────────────────
const searchProducts = asyncHandler(async (req, res) => {
  const query = req.query.q?.trim()
  if (!query) return res.json([])

  const dbProducts = await Product.find({
    isDeleted: false,
    isListed:  true,
    $or: [
      { title:            { $regex: query, $options: 'i' } },
      { 'variants.color': { $regex: query, $options: 'i' } },
      { 'variants.size':  { $regex: query, $options: 'i' } },
    ],
  })
    .populate('brand_id',    'name isActive isDeleted')
    .populate('category_id', 'name isListed isDeleted')
    .lean()

  const result = []

  for (const p of dbProducts) {
    if (!p.brand_id?.isActive || p.brand_id?.isDeleted) continue
    if (!p.category_id?.isListed || p.category_id?.isDeleted) continue

    const effective_price = getEffectivePrice(p)

    p.variants
      .filter(v => v.quantity > 0)
      .forEach(v => {
        result.push({
          productId:       p._id,
          variantId:       v._id,
          title:           p.title,
          brand:           p.brand_id?.name    || 'Unknown',
          category:        p.category_id?.name || 'Uncategorized',
          color:           v.color,
          size:            v.size,
          regular_price:   p.regular_price,
          effective_price,
          image: v.images?.length > 0 ? v.images[0] : '/images/no-image.png',
        })
      })
  }

  res.json(result.slice(0, 8))
})

module.exports = {
  loadHome,
  loadProfile,
  logoutUser,
  loadProducts,
  loadSingleProduct,
  searchProducts,
}