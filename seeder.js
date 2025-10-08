import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://13.202.146.173:27017/medical_dev';

const USERNAME = '9902262397';
const PASSWORD = '123456789';
const ROLE = 'admin';

const connect = async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
};

const disconnect = async () => {
  await mongoose.disconnect();
};

const insertUser = async () => {
  const exists = await User.findOne({ username: USERNAME });
  if (exists) {
    console.log(`User ${USERNAME} already exists (id=${exists._id}). Skipping insert.`);
    return exists;
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await User.create({ username: USERNAME, passwordHash, role: ROLE });
  console.log(`Inserted user ${USERNAME} with id=${user._id}`);
  return user;
};

const deleteUser = async () => {
  const res = await User.deleteOne({ username: USERNAME });
  if (res.deletedCount > 0) {
    console.log(`Deleted user ${USERNAME}.`);
  } else {
    console.log(`No user ${USERNAME} found to delete.`);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node seeder.js -i | -d');
    process.exit(0);
  }
  try {
    await connect();
    if (args.includes('-i')) {
      await insertUser();
    } else if (args.includes('-d')) {
      await deleteUser();
    } else {
      console.log('Unknown flag. Use -i to insert, -d to delete');
    }
  } catch (err) {
    console.error('Seeder error:', err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
};

main();
