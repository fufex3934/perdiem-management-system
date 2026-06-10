import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;
let mongoUri: string | null = null;
let refCount = 0;

export async function startMongoMemoryServer(): Promise<string> {
  if (mongoUri) {
    refCount += 1;
    return mongoUri;
  }

  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'perdiem-test' },
  });
  mongoUri = mongoServer.getUri();
  refCount = 1;
  return mongoUri;
}

export async function stopMongoMemoryServer(): Promise<void> {
  if (refCount > 0) {
    refCount -= 1;
  }

  if (refCount === 0 && mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
    mongoUri = null;
  }
}
