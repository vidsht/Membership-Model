# Backend Models

This directory previously contained MongoDB/Mongoose models which have been removed as part of the migration to MySQL.

The database schema is now defined in `/database_schema.sql` at the project root.

All database operations are handled through direct SQL queries using the MySQL connection from `/db.js`.

## Migration Notes

- All Mongoose models have been converted to SQL table definitions
- Database operations now use `db.query()` instead of Mongoose methods
- Schema validation is handled through SQL constraints and application-level validation

## Related Files

- `/database_schema.sql` - Complete MySQL schema
- `/backend/db.js` - Database connection
- `/backend/routes/*` - API endpoints with SQL queries
