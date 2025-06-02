const mongoose = require('mongoose');
require('dotenv').config();
const config = require('../config/environment');
const User = require('../models/User');
const Connection = require('../models/Connection');

(async () => {
  try {
    await mongoose.connect(config.mongoUri);

    const provider = await User.findOne({ email: 'rowan.franciscus.3@gmail.com' });
    const patient = await User.findOne({ email: 'rowan.franciscus.4@gmail.com' });

    if (!provider || !patient) {
      console.log('Provider or patient not found.');
      process.exit();
    }

    const conn = await Connection.findOne({ provider: provider._id, patient: patient._id });
    if (!conn) {
      console.log('No connection exists between these users.');
    } else {
      await Connection.deleteOne({ _id: conn._id });
      console.log('Connection deleted:', conn._id.toString());
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
})(); 