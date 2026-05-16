

const User = require('../models/userModel')

const isUser = async (req, res, next) => {
  try {
    if (req.session?.user) {

      const user = await User.findById(req.session.user._id)

      if (user && user.is_active) {
        return next()
      }

      delete req.session.user

      if (req.xhr || req.headers['content-type']?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again'
        })
      }

      return res.redirect('/auth/login')
    }

    if (req.xhr || req.headers['content-type']?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login'
      })
    }

    return res.redirect('/auth/login')

  } catch (err) {
    console.error(err)
    return res.redirect('/auth/login')
  }
}



const isAdmin = (req,res,next) => {

    if(req.session && req.session?.admin) {
        return next()
    }
    
    if(req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please login'
    });
  }

    res.redirect('/admin/login')
      
}



module.exports = {isAdmin,isUser}