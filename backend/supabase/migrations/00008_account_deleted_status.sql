-- PostgreSQL requires a newly added enum value to be committed before it can
-- be used. Keep this expansion in its own migration before the deletion RPC.
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'deleted';
