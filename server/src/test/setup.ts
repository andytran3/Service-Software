import '../config/load-env.js';
import { validateTestDatabaseUrl } from './test-db.js';

// Fail the whole run unless the test database is isolated from the dev database.
validateTestDatabaseUrl(process.env['DATABASE_URL_TEST'], process.env['DATABASE_URL']);

// Remove the dev URL so no test can connect to the development database by accident.
delete process.env['DATABASE_URL'];
