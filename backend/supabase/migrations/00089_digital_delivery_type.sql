-- Expand the existing delivery enum in a standalone migration because
-- PostgreSQL only permits a newly-added enum value to be used after commit.
ALTER TYPE public.delivery_type ADD VALUE IF NOT EXISTS 'digital';
