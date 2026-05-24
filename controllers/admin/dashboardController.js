const Order = require('../../models/orderModel');
// const Customer = require('../models/Customer');
const Product = require('../../models/productModel');

exports.getDashboard = async (req, res) => {
  try {

    const totalSales = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(data => data[0]?.total || 0);

    
    const totalCustomers = await Order.distinct('user').countDocuments();

   
    const totalOrders = await Order.countDocuments();

    
    const bestSelling = await Order.aggregate([
      { $unwind: '$items' }, 
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.title' }, 
          sales: { $sum: '$items.totalPrice' } 
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          name: { $ifNull: ['$name', { $arrayElemAt: ['$product.name', 0] }] },
          sales: 1
        }
      }
    ]).then(data => data.map(item => ({
      name: item.name || 'Unknown',
      sales: item.sales || 0
    })));

    // Recent Orders 
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'full_name') 
      .select('totalAmount createdAt items user paymentStatus');

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      totalSales,
      totalCustomers,
      totalOrders,
      bestSelling,
      recentOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};