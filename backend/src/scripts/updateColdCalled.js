import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Lead from '../models/Lead.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trackme');
  const leads = await Lead.find({});
  let updatedCount = 0;
  for (const l of leads) {
    if (l.status !== 'New Lead') {
      l.coldCalled = true;
      l.coldCalledAt = l.coldCalledAt || l.createdAt;
      await l.save();
      updatedCount++;
    }
  }
  const totalCalls = await Lead.countDocuments({ coldCalled: true });
  console.log(`Updated ${updatedCount} leads. Total coldCalled leads now: ${totalCalls}`);
  process.exit(0);
}
run();
