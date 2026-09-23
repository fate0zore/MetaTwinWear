CREATE TABLE configuration_revision (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL UNIQUE,
    created_at_ms INTEGER NOT NULL,
    model TEXT NOT NULL,
    type TEXT NOT NULL,
    diameter REAL NOT NULL,
    length REAL NOT NULL,
    tooth_count INTEGER NOT NULL,
    material TEXT NOT NULL,
    workpiece_size TEXT NOT NULL,
    workpiece_material TEXT NOT NULL
);

CREATE TABLE monitoring_run (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'STOPPED')),
    created_at_ms INTEGER NOT NULL,
    stopped_at_ms INTEGER,
    active_alert_id TEXT,
    alert_at_ms INTEGER
);

CREATE TABLE telemetry_sample (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES monitoring_run(id),
    configuration_id TEXT NOT NULL REFERENCES configuration_revision(id),
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

CREATE INDEX idx_telemetry_run_sequence ON telemetry_sample(run_id, sequence);
CREATE INDEX idx_telemetry_captured_at ON telemetry_sample(captured_at_ms);
