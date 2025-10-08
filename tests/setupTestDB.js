import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replset;

export const connectTestDB = async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
  const uri = replset.getUri();
  await mongoose.connect(uri);
};

export const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (replset) await replset.stop();
};

export const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};


