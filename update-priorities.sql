-- Update plan priorities for proper upgrade system

UPDATE plans SET priority = 1 WHERE `key` = 'community' OR `key` = 'basic';
UPDATE plans SET priority = 2 WHERE `key` = 'silver';
UPDATE plans SET priority = 3 WHERE `key` = 'gold';
UPDATE plans SET priority = 4 WHERE `key` = 'platinum' OR `key` = 'diamond';

-- Verify the updates
SELECT `key`, name, priority, type FROM plans WHERE type = 'user' ORDER BY priority;
