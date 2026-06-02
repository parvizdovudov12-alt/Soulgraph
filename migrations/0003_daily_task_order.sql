ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, created_at ASC) - 1 AS next_order
  FROM daily_tasks
)
UPDATE daily_tasks
SET order_index = ordered.next_order
FROM ordered
WHERE daily_tasks.id = ordered.id
  AND daily_tasks.order_index = 0;

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_order
ON daily_tasks (user_id, pinned, order_index);
