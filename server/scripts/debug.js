const mongoose = require('mongoose');
const User = require('../src/models/User');

async function test() {
  try {
    const user = new User({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
    });
    console.log("Before save:", user.password, user);
    await user.validate();
    console.log("Validation passed.");
  } catch (err) {
    console.log("Validation error:", err);
  }
}
test();
