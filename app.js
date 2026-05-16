require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/Admin/adminRouter');
const userRoutes = require('./routes/User')
const expressLayouts = require('express-ejs-layouts');
const passport = require('./config/passport-setup')
const nocache = require('nocache')
const globalMiddleware = require('./middlewares/globalMiddleware')
const {errorLog,apiLog} = require('./config/logger')

const app = express();
const port = process.env.PORT || 3000;

connectDB();
app.use(nocache())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(globalMiddleware)

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/adminLayout');

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize())
app.use(passport.session())
app.use(flash());


app.use((req, res, next) => {

    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

app.use('/admin', adminRoutes);
app.use(userRoutes);

app.all('/*splat',(req,res)=>{
    res.render('user/404-page',{layout:false})
})

app.listen(port, () => console.log(`Server started on http://localhost:${port}/`));