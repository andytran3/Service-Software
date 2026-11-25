// Resolves the isolated test database URL and refuses anything that could be the dev database.
function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

let validatedTestUrl: string | undefined;

/** Validates DATABASE_URL_TEST against DATABASE_URL. Call once from the test setup file. */
export function validateTestDatabaseUrl(
  testUrl: string | undefined,
  devUrl: string | undefined,
): string {
  if (!testUrl) {
    throw new Error('DATABASE_URL_TEST is not set. Copy .env.example to .env.');
  }
  const testDb = databaseName(testUrl);
  if (!testDb.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${testDb}": the name must end in "_test".`);
  }
  if (devUrl && databaseName(devUrl) === testDb) {
    throw new Error('DATABASE_URL_TEST must point to a different database than DATABASE_URL.');
  }
  validatedTestUrl = testUrl;
  return testUrl;
}

export function getTestDatabaseUrl(): string {
  if (!validatedTestUrl) {
    throw new Error('Test database URL has not been validated; is src/test/setup.ts loaded?');
  }
  return validatedTestUrl;
}
