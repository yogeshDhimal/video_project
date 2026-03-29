/**
 * Usage: node scripts/makeAdmin.js user@email.com
 * Requires MONGODB_URI in .env (run from server directory).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/makeAdmin.js user@email.com');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const u = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  console.log(u ? `Updated ${email} to admin` : 'User not found');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
