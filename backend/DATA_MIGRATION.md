# SQLite 数据与 PostgreSQL 迁移约定

当前模式由 Flyway 迁移定义。V3 删除服务器配置历史表及采样配置外键，保留所有运行与采样记录；已有配置历史随迁移删除。数据库位于 `backend/data/metatwinwear.sqlite`，也可通过 `METATWINWEAR_DB_PATH` 指定。迁移 PostgreSQL 时先停止业务服务并复制 SQLite 文件，再导出与导入，避免采样期间数据变化。

| SQLite 表 | 主键及关联 | 迁移约定 |
|---|---|---|
| `monitoring_run` | 文本 UUID `id` | 保留状态、告警 ID 与时间；`created_at_ms`、`stopped_at_ms`、`alert_at_ms` 是 UTC Unix 毫秒。 |
| `telemetry_sample` | 文本 UUID `id`；`run_id` 外键 | 保留全部采样、原始序号及外键；`captured_at_ms` 是 UTC Unix 毫秒；`(run_id, sequence)` 唯一。 |
| `tool_catalog` | 产品型号 `model` 主键 | 目录记录来自 `doc/立铣刀/立铣刀参数.xlsx` 与对应 `catalogue.csv`；规格、产品描述和相对主图路径由 Flyway V2 导入。JPEG 文件保留在 `doc/`，PostgreSQL 迁移时仍需提供该静态资源目录。 |

SQLite `INTEGER` 毫秒字段在 PostgreSQL 中使用 `BIGINT`，或在导入时无损转换为 `TIMESTAMPTZ`。SQLite `REAL` 字段按现有精度使用 PostgreSQL `DOUBLE PRECISION`，枚举状态使用 `TEXT` 与约束。先导入运行，再导入采样；核对两表记录数及运行与采样的外键关系。运行和采样 ID 不重新生成。后续实现切换时再编写 PostgreSQL Flyway 脚本、导入工具与回滚说明。
