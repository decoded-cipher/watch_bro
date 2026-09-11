-- Search results are derived from the query and never mutate, so they belong
-- in a cache, not a table. Paging state moved into the callback payload and
-- the message id comes from the callback itself, leaving nothing to persist.

DROP TABLE IF EXISTS searches;
