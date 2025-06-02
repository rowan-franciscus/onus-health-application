/**
 * Update Admin Account Script
 * 
 * This script:
 * 1. Adds a new admin account with full admin privileges
 * 2. Removes the test admin account
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/environment');
const User = require('../models/User');

async function main() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}`);
    
    // 1. Remove the test admin account
    const testAdminEmail = 'admin.test@email.com';
    const testAdmin = await User.findOne({ email: testAdminEmail });
    
    if (testAdmin) {
      await User.deleteOne({ email: testAdminEmail });
      console.log(`✅ Removed test admin account: ${testAdminEmail}`);
    } else {
      console.log(`Test admin account not found: ${testAdminEmail}`);
    }
    
    // 2. Check if the new admin already exists
    const newAdminEmail = 'rowan.franciscus.2@gmail.com';
    const existingAdmin = await User.findOne({ email: newAdminEmail });
    
    if (existingAdmin) {
      console.log(`Admin account already exists: ${newAdminEmail}`);
      console.log('Updating admin account with new details...');
      
      // Update the existing admin
      const hashedPassword = await bcrypt.hash('password@123', 12);
      
      await User.updateOne(
        { email: newAdminEmail },
        {
          $set: {
            firstName: 'Rowan',
            lastName: 'Franciscus',
            password: hashedPassword,
            role: 'admin',
            isEmailVerified: true,
            isProfileCompleted: true,
            'adminProfile.adminLevel': 'super'
          }
        }
      );
      
      console.log(`✅ Updated admin account: ${newAdminEmail}`);
    } else {
      // 3. Create the new admin account
      const hashedPassword = await bcrypt.hash('password@123', 12);
      
      const newAdmin = new User({
        email: 'rowan.franciscus.2@gmail.com',
        password: hashedPassword,
        firstName: 'Rowan',
        lastName: 'Franciscus',
        role: 'admin',
        isEmailVerified: true,
        isProfileCompleted: true,
        adminProfile: {
          department: 'Administration',
          adminLevel: 'super'
        }
      });
      
      await newAdmin.save();
      console.log(`✅ Created new admin account: ${newAdminEmail}`);
    }
    
    // 4. Verify the new admin
    const admin = await User.findOne({ email: newAdminEmail });
    if (admin) {
      console.log(`\nAdmin Account Details:`);
      console.log(`- Email: ${admin.email}`);
      console.log(`- Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`- Role: ${admin.role}`);
      console.log(`- Admin Level: ${admin.adminProfile?.adminLevel || 'standard'}`);
      console.log(`- Verified: ${admin.isEmailVerified ? 'Yes' : 'No'}`);
      console.log(`- Profile Completed: ${admin.isProfileCompleted ? 'Yes' : 'No'}`);
      
      // Test password
      try {
        const passwordMatches = await bcrypt.compare('password@123', admin.password);
        console.log(`- Password Verification: ${passwordMatches ? '✅ Success' : '❌ Failed'}`);
      } catch (error) {
        console.log(`- Password Verification: ❌ Error - ${error.message}`);
      }
      
      console.log('\n✅ Admin account setup completed successfully!');
      console.log('You can now sign in with:');
      console.log('- Email: rowan.franciscus.2@gmail.com');
      console.log('- Password: password@123');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error); 