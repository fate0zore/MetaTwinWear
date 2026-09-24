package com.metatwinwear.monitoring;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Set;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ConfigurationRemovalMigrationTest {
    @TempDir Path temporaryDirectory;

    @Test
    void removesConfigurationStorageAndPreservesExistingRunsAndSamples() throws Exception {
        String url = "jdbc:sqlite:" + temporaryDirectory.resolve("legacy.sqlite").toAbsolutePath();
        migrateToVersionTwo(url);
        insertLegacyRows(url);

        Flyway.configure()
                .dataSource(url, "", "")
                .locations("classpath:db/migration")
                .load()
                .migrate();

        try (Connection connection = DriverManager.getConnection(url)) {
            assertFalse(tableExists(connection, "configuration_revision"));
            assertTrue(tableExists(connection, "monitoring_run"));
            assertEquals(1, count(connection, "monitoring_run"));
            assertEquals(2, count(connection, "telemetry_sample"));
            assertEquals(Set.of("id", "run_id", "sequence", "captured_at_ms", "spindle_speed", "feed_rate",
                    "cutting_depth", "cutting_width", "vibration_value", "current_value", "sound_value",
                    "force_value", "force_x", "force_y", "force_z", "wear_value", "predicted_wear_value",
                    "wear_rate", "remaining_life", "stage", "status"), columns(connection, "telemetry_sample"));
            assertEquals(Set.of("monitoring_run"), foreignKeyTargets(connection, "telemetry_sample"));
            try (Statement statement = connection.createStatement();
                 ResultSet rows = statement.executeQuery(
                         "SELECT id, run_id, sequence, captured_at_ms FROM telemetry_sample ORDER BY sequence")) {
                assertTrue(rows.next());
                assertEquals("sample-1", rows.getString("id"));
                assertEquals("run-1", rows.getString("run_id"));
                assertEquals(1, rows.getLong("sequence"));
                assertEquals(1_700_000_000_000L, rows.getLong("captured_at_ms"));
                assertTrue(rows.next());
                assertEquals("sample-2", rows.getString("id"));
                assertEquals(2, rows.getLong("sequence"));
                assertFalse(rows.next());
            }
        }
    }

    private void migrateToVersionTwo(String url) {
        Flyway.configure()
                .dataSource(url, "", "")
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("2"))
                .load()
                .migrate();
    }

    private void insertLegacyRows(String url) throws Exception {
        try (Connection connection = DriverManager.getConnection(url);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO configuration_revision (id, version, created_at_ms, model, type, "
                    + "diameter, length, tooth_count, material, workpiece_size, workpiece_material) "
                    + "VALUES ('config-1', 1, 1700000000000, 'model-1', 'mill', 12, 103, 4, "
                    + "'carbide', '120 x 80 x 50', 'steel')");
            statement.executeUpdate("INSERT INTO monitoring_run (id, status, created_at_ms) "
                    + "VALUES ('run-1', 'STOPPED', 1700000000000)");
            String insertSample = "INSERT INTO telemetry_sample (id, run_id, configuration_id, sequence, "
                    + "captured_at_ms, spindle_speed, feed_rate, cutting_depth, cutting_width, vibration_value, "
                    + "current_value, sound_value, force_value, force_x, force_y, force_z, wear_value, "
                    + "predicted_wear_value, wear_rate, remaining_life, stage, status) VALUES "
                    + "('%s', 'run-1', 'config-1', %d, %d, 12000, 800, 2.0, 10.0, 1.0, 32.0, 76.0, "
                    + "300.0, 310.0, 240.0, 168.0, 0.055, 0.061, 0.012, 18.6, '初始状态', 'normal')";
            statement.executeUpdate(insertSample.formatted("sample-1", 1, 1_700_000_000_000L));
            statement.executeUpdate(insertSample.formatted("sample-2", 2, 1_700_000_001_000L));
        }
    }

    private boolean tableExists(Connection connection, String table) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?")) {
            statement.setString(1, table);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next() && rows.getInt(1) > 0;
            }
        }
    }

    private int count(Connection connection, String table) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            rows.next();
            return rows.getInt(1);
        }
    }

    private Set<String> columns(Connection connection, String table) throws Exception {
        Set<String> columns = new HashSet<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (rows.next()) columns.add(rows.getString("name"));
        }
        return columns;
    }

    private Set<String> foreignKeyTargets(Connection connection, String table) throws Exception {
        Set<String> targets = new HashSet<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("PRAGMA foreign_key_list(" + table + ")")) {
            while (rows.next()) targets.add(rows.getString("table"));
        }
        return targets;
    }
}
