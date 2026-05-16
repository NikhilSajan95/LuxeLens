const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:{type:String, required:true, trim:true},
    email:{type:String, required:true, unique:true, lowercase:true, trim:true},
    password:{type:String, required:false},
    mobile:{type:String, required:false, unique:true, sparse:true, trim:true},
    googleId:{type:String, unique:true, sparse: true},
    profile_image:{type:String, default:null},
    is_active:{type:Boolean, default:true},
    
},{timestamps:true})


const user = mongoose.model('User',userSchema)




module.exports = user