-- Convert OddsSnapshot and LineMovement into TimescaleDB hypertables
-- Run this AFTER prisma migrate dev

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert OddsSnapshot to hypertable
SELECT create_hypertable(
  '"OddsSnapshot"',
  '"capturedAt"',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Convert LineMovement to hypertable
SELECT create_hypertable(
  '"LineMovement"',
  '"capturedAt"',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Create compression policy for OddsSnapshot (compress data older than 7 days)
SELECT add_compression_policy('"OddsSnapshot"', INTERVAL '7 days');

-- Create compression policy for LineMovement
SELECT add_compression_policy('"LineMovement"', INTERVAL '7 days');
