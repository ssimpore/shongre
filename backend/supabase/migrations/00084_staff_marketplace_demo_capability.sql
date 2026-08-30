-- =============================================================================
-- Explicit Staff marketplace demo permission
-- Migration: 00084_staff_marketplace_demo_capability.sql
--
-- This sensitive capability is intentionally not assigned to any role. It may
-- only be granted through the audited capability-override workflow and is
-- consumed exclusively by isolated client demo adapters. Production API and
-- database marketplace mutations remain governed by Staff separation.
-- =============================================================================

INSERT INTO public.access_capabilities (id, is_sensitive)
VALUES ('staff.marketplace.demo', TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;
