// Runs before any test module is imported, so the validated config sees these values.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/synent_courses_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-1234567890';
process.env.CLIENT_URL = 'http://localhost:5175';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.MOCK_PAYMENT_SECRET = 'test-mock-secret';
process.env.MAIL_TRANSPORT = 'outbox';
process.env.RATE_LIMIT_DISABLED = 'true';
