-- fuarbul fair data reset
-- Purpose: remove all fair records and fair-linked data before a fresh TOBB import.
-- Run the SELECT section first and review counts. Run the DELETE transaction only
-- after taking a database backup.

-- 1) Pre-delete counts
SELECT 'Fair' AS table_name, COUNT(*) AS records_to_delete
FROM "Fair"
UNION ALL
SELECT 'FairCategory', COUNT(*)
FROM "FairCategory"
WHERE "fairId" IN (SELECT "id" FROM "Fair")
UNION ALL
SELECT 'FairSubcategory', COUNT(*)
FROM "FairSubcategory"
WHERE "fairId" IN (SELECT "id" FROM "Fair")
UNION ALL
SELECT 'FollowedFair', COUNT(*)
FROM "FollowedFair"
WHERE "fairId" IN (SELECT "id" FROM "Fair")
UNION ALL
SELECT 'NotificationLog', COUNT(*)
FROM "NotificationLog"
WHERE "fairId" IN (SELECT "id" FROM "Fair")
UNION ALL
SELECT 'FairSource', COUNT(*)
FROM "FairSource"
WHERE "fairId" IN (SELECT "id" FROM "Fair")
UNION ALL
SELECT 'AdminActionLog fair references', COUNT(*)
FROM "AdminActionLog"
WHERE "fairId" IN (SELECT "id" FROM "Fair")
UNION ALL
SELECT 'ImportJob', COUNT(*)
FROM "ImportJob";

-- 2) Delete fair-linked records first, then fairs.
-- Keep Category, Subcategory, User, Account, Session, NotificationPreference,
-- UserInterest and UserSubInterest data intact.
BEGIN;

DELETE FROM "NotificationLog"
WHERE "fairId" IN (SELECT "id" FROM "Fair");

DELETE FROM "FollowedFair"
WHERE "fairId" IN (SELECT "id" FROM "Fair");

DELETE FROM "FairSubcategory"
WHERE "fairId" IN (SELECT "id" FROM "Fair");

DELETE FROM "FairCategory"
WHERE "fairId" IN (SELECT "id" FROM "Fair");

DELETE FROM "FairSource"
WHERE "fairId" IN (SELECT "id" FROM "Fair");

DELETE FROM "AdminActionLog"
WHERE "fairId" IN (SELECT "id" FROM "Fair");

DELETE FROM "ImportJob";

DELETE FROM "Fair";

COMMIT;

-- 3) Post-delete verification counts
SELECT 'Fair' AS table_name, COUNT(*) AS remaining_records
FROM "Fair"
UNION ALL
SELECT 'FairCategory', COUNT(*)
FROM "FairCategory"
UNION ALL
SELECT 'FairSubcategory', COUNT(*)
FROM "FairSubcategory"
UNION ALL
SELECT 'FollowedFair', COUNT(*)
FROM "FollowedFair"
UNION ALL
SELECT 'NotificationLog', COUNT(*)
FROM "NotificationLog"
UNION ALL
SELECT 'FairSource', COUNT(*)
FROM "FairSource"
UNION ALL
SELECT 'AdminActionLog fair references', COUNT(*)
FROM "AdminActionLog"
WHERE "fairId" IS NOT NULL
UNION ALL
SELECT 'ImportJob', COUNT(*)
FROM "ImportJob";

-- 4) Identity/sequence reset
-- No reset is required for the current schema because primary keys use
-- String @default(cuid()), not autoincrement/identity columns.
