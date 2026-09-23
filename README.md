# MetaTwinWear

Vue 3 前端与 Java 17 / Spring Cloud 后端位于同一仓库。首期后端由 Eureka 注册中心、Spring Cloud Gateway 和单实例监控业务服务组成；数据保存在 SQLite 文件中。

## 目录

- `frontend/`：Vue 3、Vite、Pinia 前端及演示视频、图片。
- `backend/common/`：后端服务共用的 Java 类型、配置、业务能力和资源库。
- `backend/discovery-server/`：Eureka 注册中心，端口 `8761`。
- `backend/api-gateway/`：网关，端口 `8080`，显式转发 `/api/v1/**`。
- `backend/monitoring-service/`：业务服务，端口 `8081`，含监控、配置与预测逻辑。
- `backend/openapi.yaml`：首期接口的 OpenAPI 3 文档。
- `backend/monitoring-service/src/main/resources/db/migration/`：Flyway 版本化 SQLite 建表脚本。
- `backend/data/metatwinwear.sqlite`：默认运行数据库，已被 Git 忽略。

## 前端

在仓库根目录运行前端命令。首次启动时，脚本会检查前端依赖；若 `frontend/node_modules` 不存在，会自动执行 `npm --prefix frontend ci`。也可以手动提前安装：

```sh
npm --prefix frontend ci
```

### Mock 模式

只启动前端，数据完全由本地 Mock 生成，不依赖后端：

```sh
npm run dev:mock
```

`npm run dev` 也是 Mock 模式的快捷入口。

### 前后端联调模式

在仓库根目录运行：

```sh
npm run dev:integration
```

脚本依次启动 Eureka（`8761`）、监控业务服务（`8081`）、Gateway（`8080`）和 API 模式前端（`5173`），每个服务就绪后再启动下一个。运行期间保持这个终端打开，按 `Ctrl+C` 会停止本次启动的服务。若所需端口已被占用，脚本会提示并退出。首次启动后端需要网络下载 Gradle 和 Maven 依赖。

前端开发服务器把 `/api` 代理至 `http://localhost:8080`。API 模式断线时显示连接状态并自动重连 SSE；不切回 Mock。生产部署需要让前端同源 `/api` 路径指向网关。视频、图片及图标仍由前端静态资源提供。

### 构建及预览

```sh
npm run build
npm run preview
```

## 后端

需要 Java 17。Gradle 8.14.5 已随 `backend/gradlew` 和 `backend/gradlew.bat` 固定，无需单独安装。手动启动时，从 `backend/` 执行以下命令，分别在三个终端中按顺序启动：

```powershell
cd backend
.\gradlew.bat :discovery-server:bootRun
```

```powershell
cd backend
.\gradlew.bat :monitoring-service:bootRun
```

```powershell
cd backend
.\gradlew.bat :api-gateway:bootRun
```

Linux/macOS 将上面的 `.\gradlew.bat` 换成 `bash ./gradlew`。首次启动业务服务时 Flyway 创建表并生成默认配置、停止状态的运行与 42 个示例采样。后续启动会恢复配置和历史采样，监听状态置为停止。默认数据库文件为 `backend/data/metatwinwear.sqlite`；可设置 `METATWINWEAR_DB_PATH` 为另一个 SQLite 文件路径，父目录需事先存在。一个数据库只应由一个业务服务实例写入。

执行全部后端构建与测试：

```powershell
cd backend
.\gradlew.bat build
```

网关接口示例：

```sh
curl http://localhost:8080/api/v1/monitoring/snapshot
curl -N http://localhost:8080/api/v1/monitoring/events
```

`start`、`stop` 为幂等控制，`reset` 停止监听、恢复默认配置并创建新运行；旧运行与采样保留。所有访问者共用一个模拟器和配置，无登录。采样约每秒一次，长期保留；图表只读取当前运行最近 42 个采样。过程参数和磨损阈值首期只读。告警关闭状态仅保存在当前浏览器页面。完整接口见 [OpenAPI 文档](backend/openapi.yaml)。

## 后续迁至 PostgreSQL

本期没有 PostgreSQL 建表或导入逻辑，也不会接触其他项目数据库。迁移时按 [字段与导出约定](backend/DATA_MIGRATION.md) 新增 PostgreSQL 迁移脚本和导入程序，保留运行、配置、采样的 ID、时间戳与关系。
