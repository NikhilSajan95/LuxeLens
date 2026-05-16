const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    email: {type:String, required:true, unique:true, lowercase:true, trim:true},
    password: {type:String, required:true}
},{timestamps:true})

const admin = mongoose.model('Admin',adminSchema)

module.exports = admin