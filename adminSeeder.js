require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/adminModel');



const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI,{
      tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  family: 4, // Force IPv4
      
    });
    console.log('✅ Connected to MongoDB');


      const hashedPassword = await bcrypt.hash('admin123', 10);

      const adminUser = new Admin({
        name: 'admin',
        email: 'admin@luxelens.com',
        password: hashedPassword,
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
    

    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error seeding admin:', err);
    mongoose.connection.close();
  }
};

seedAdmin();
