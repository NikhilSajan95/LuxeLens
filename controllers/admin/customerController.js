const User = require('../../models/userModel');
const Category = require('../../models/categoryModel');

const customerController = {
  getCustomers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const search = req.query.search || '';

      const query = {
      
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };

      const totalUsers = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.render('admin/customers', {
        title: 'Customer Management', 
        users,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        search
      });
    } catch (err) {
      console.error('Error fetching customers:', err);
      res.status(500).send('Server error');
    }
  },

  toggleBlockUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.is_active = !user.is_active;
      await user.save();

      const action = user.is_active ? 'unblocked' : 'blocked';

      res.json({ 
        success: true, 
        is_active: user.is_active, 
        message: `User successfully ${action}.` 
      });

    } catch (err) {
      console.error('Error toggling user block:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = customerController;