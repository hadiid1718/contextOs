const devDb = db.getSiblingDB('stackmind_dev');
devDb.createCollection('healthcheck');
devDb.healthcheck.insertOne({
  status: 'ok',
  env: 'development',
  createdAt: new Date(),
});

const testDb = db.getSiblingDB('stackmind_test');
testDb.createCollection('healthcheck');
testDb.healthcheck.insertOne({
  status: 'ok',
  env: 'test',
  createdAt: new Date(),
});
