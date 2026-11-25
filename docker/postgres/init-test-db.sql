-- Creates the isolated database used by automated tests.
-- Docker runs this only when the postgres-data volume is first initialized.
-- The name must match the database in DATABASE_URL_TEST.
CREATE DATABASE requests_test;
