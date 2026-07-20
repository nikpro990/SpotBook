process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://spotbook:spotbook_dev_pw@localhost:5432/spotbook_test';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
