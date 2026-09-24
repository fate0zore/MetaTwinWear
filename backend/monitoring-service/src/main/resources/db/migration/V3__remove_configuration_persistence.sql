CREATE TABLE telemetry_sample_without_configuration (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES monitoring_run(id),
    sequence INTEGER NOT NULL,
    captured_at_ms INTEGER NOT NULL,
    spindle_speed INTEGER NOT NULL,
    feed_rate INTEGER NOT NULL,
    cutting_depth REAL NOT NULL,
    cutting_width REAL NOT NULL,
    vibration_value REAL NOT NULL,
    current_value REAL NOT NULL,
    sound_value REAL NOT NULL,
    force_value REAL NOT NULL,
    force_x REAL NOT NULL,
    force_y REAL NOT NULL,
    force_z REAL NOT NULL,
    wear_value REAL NOT NULL,
    predicted_wear_value REAL NOT NULL,
    wear_rate REAL NOT NULL,
    remaining_life REAL NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('normal', 'warning', 'danger')),
    UNIQUE (run_id, sequence)
);

INSERT INTO telemetry_sample_without_configuration (
    id, run_id, sequence, captured_at_ms, spindle_speed, feed_rate, cutting_depth, cutting_width,
    vibration_value, current_value, sound_value, force_value, force_x, force_y, force_z,
    wear_value, predicted_wear_value, wear_rate, remaining_life, stage, status
)
SELECT
    id, run_id, sequence, captured_at_ms, spindle_speed, feed_rate, cutting_depth, cutting_width,
    vibration_value, current_value, sound_value, force_value, force_x, force_y, force_z,
    wear_value, predicted_wear_value, wear_rate, remaining_life, stage, status
FROM telemetry_sample;

DROP TABLE telemetry_sample;
ALTER TABLE telemetry_sample_without_configuration RENAME TO telemetry_sample;
DROP TABLE configuration_revision;

CREATE INDEX idx_telemetry_run_sequence ON telemetry_sample(run_id, sequence);
CREATE INDEX idx_telemetry_captured_at ON telemetry_sample(captured_at_ms);
