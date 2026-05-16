
const asyncHandler = require('express-async-handler');
const Admin = require('../../models/adminModel'); 
const bcrypt = require('bcrypt');
const messages = require('../../constants/messages'); 
const { success } = require('zod');
const adminLoginLayout = '../views/layouts/adminLoginLayout'



const getLogin = asyncHandler(async (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
   
    res.render('admin/login', { layout: adminLoginLayout });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
        req.flash('error', messages.ADMIN.INVALID_CREDENTIALS);
        return res.redirect('/admin/login');
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
        req.flash('error', messages.ADMIN.INVALID_CREDENTIALS);
        return res.redirect('/admin/login');
    }

    req.session.admin = admin._id;
    req.flash('success', messages.ADMIN.WELCOME); 
    return res.redirect('/admin/dashboard');
});

const logout = asyncHandler(async (req, res) => {

    req.session.destroy(()=>{
        res.clearCookie("connect.sid");
        res.status(200).json({
        success:true,
        message:messages.AUTH.LOGOUT_SUCCESS,
        redirectUrl:"/admin/login"
    })
    }) 
    
    // req.flash('success', messages.AUTH.LOGOUT_SUCCESS);
    
});


const getDashboard = asyncHandler(async (req, res) => {
    res.render('admin/dashboard',{
      title:'Dashboard',
      totalSales:0,
      totalCustomers:0,
      totalOrders:0,
      bestSelling:[],
      recentOrders:[]
    });
});

module.exports = { 
    getLogin, 
    login, 
    logout, 
    getDashboard 
};