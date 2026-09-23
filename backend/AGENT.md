# MetaTwinWear 后端开发规范

## 1. 适用范围

本文件面向 AI Agent 和人工开发者，适用于 `backend/` 下的开发与维护。规则级别如下：

- **必须**：除非有明确且已记录的例外，否则不可违反。
- **应该**：默认遵守；确有合理原因时可以偏离。
- **可以**：允许采用，但不是强制要求。

后端使用 Java 17 和 Gradle 多模块构建。当前模块为 `common`（跨服务共享库）、`discovery-server`（Eureka 注册中心）、`api-gateway`（Spring Cloud Gateway）和 `monitoring-service`（业务服务）。Gradle 版本由 wrapper 固定；Spring Boot、Spring Cloud 及各模块依赖以 `build.gradle` 为准。下文的业务分层要求适用于 `monitoring-service` 及后续业务服务，不要求网关或注册中心建立空的业务层目录。

## 2. Agent 工作方式

### 必须

- 修改前阅读相关代码、模块的 `build.gradle`、配置和测试；涉及接口或数据时同时阅读 `openapi.yaml`、Flyway 迁移文件及 `DATA_MIGRATION.md` 中的相关约定。
- 保持修改范围与任务一致，不为局部修复附带无关重构或接口行为变化。
- 业务行为变更补充或更新相关测试，并运行受影响模块的测试及后端全量 `build`；纯文档修改无需运行构建。
- 完成任务时说明实际改动、执行的验证及未解决的问题。
- 编写每个方法和类以及部分核心代码的javadoc文档注释，简要，且风格一致。

### 应该

- 优先复用现有类型、服务和配置；注释解释业务约束或不直观的决策，避免重复描述代码。
- 发现与任务无关的问题时先报告，不自行扩大修改范围。

## 3. 业务服务目录与职责

业务服务以 `com.metatwinwear.<service>` 为根包，例如 `monitoring-service` 使用 `com.metatwinwear.monitoring`。新增业务类按职责放入平级包：

```text
<business-service>/src/main/java/com/metatwinwear/<service>/
  controller/
  service/
  mapper/
  config/
  model/
    dto/
    entity/
```

定时任务、模拟器等有独立职责的代码可以使用 `scheduler/`、`simulation/` 等包；没有相应代码时不创建空目录。

### 必须

- `controller` 负责 HTTP 路由、请求绑定、入口校验和响应适配；通过 `service` 完成业务操作，不直接访问 `mapper`。
- `service` 负责业务规则、流程编排和事务边界；涉及并发状态的操作保持必要的同步与一致性，不把业务决策放进 Controller 或 Mapper。
- `mapper` 负责 MyBatis-Plus 映射及数据查询、写入，不承载业务流程。`model/entity` 表示持久化模型；`model/dto` 表示接口请求和响应模型，不将数据库实体直接作为对外响应。
- `config` 放置 Spring 配置、组件装配和配置选项管理等配置职责，不放置 HTTP 处理或数据访问逻辑。

### 应该

- 优先采用构造器注入。接口模型、持久化模型及其转换各守住边界，避免因数据库字段变化意外改变 API。
- 保持依赖方向清晰：Controller 调用 Service，Service 使用 Mapper；跨层调用应有明确职责原因。

`monitoring-service` 的控制器、接口模型、业务服务、Mapper、持久化实体及定时任务已按上述职责归位。后续新增代码沿用此结构；模拟器等有独立职责的代码可以保留专用包。

## 4. 跨服务共享模块

`backend/common/` 是 Gradle Java 库模块，基础包为 `com.metatwinwear.common`。各服务通过 Gradle 项目依赖使用其中的 Java 类型和 `src/main/resources/` 资源；此模块不作为独立 Spring Boot 应用启动。

### 必须

- 只有被两个或更多后端模块实际共用的类型、配置、资源或业务能力才放入 `common`；模块专属实现留在对应服务。
- `common` 不得依赖 `monitoring-service`、`api-gateway` 或 `discovery-server`，服务模块可以依赖 `common`，不得形成循环依赖。
- 共享配置不得写入某个服务专属的端口、地址、凭据或部署环境值。需要共享 Spring 配置时，应提供明确的配置类或属性类型，由服务按需采用。
- 新增共享依赖前确认它能被多个模块复用，并在 `backend/common/build.gradle` 中声明所需依赖。

### 应该

- 在 `com.metatwinwear.common` 下按职责建立子包，区分共享配置、模型、业务能力和基础工具；避免把所有类堆在根包或建没有实际用途的空包。
- 共享业务代码只承载跨服务语义一致的规则，不因代码相似就合并含义不同的业务流程。
- 共享文件放在 `backend/common/src/main/resources/`，并使用清晰的资源路径，避免与服务自己的 `application.yml` 同名覆盖。

## 5. 接口与数据约定

### 必须

- 接口变更同步更新 `backend/openapi.yaml`，保持 `/api/v1/**` 网关路由；除非需求明确修改，否则保持现有响应形态，不自行增加统一响应包装。错误响应沿用 Spring `ProblemDetail` 风格。
- 请求结构在入口使用 Bean Validation 等机制校验，涉及业务状态的约束由 Service 校验；错误信息应明确且不泄露内部实现细节。
- 数据库结构变更通过 `monitoring-service/src/main/resources/db/migration/` 下新的 Flyway 版本化脚本实施，不修改已经应用的迁移脚本。
- 当前业务数据使用 SQLite。遵守 `DATA_MIGRATION.md` 中的字段、ID、时间戳及关系约定；同一数据库文件只由一个业务服务实例写入。

### 应该

- 保持事务归属于业务操作，并为数据库相关测试使用隔离的测试数据，避免依赖本地运行数据库。
- 修改接口前核对前端调用和 `openapi.yaml`，修改持久化前核对现有迁移与历史数据兼容性。

## 6. 验证命令

在 `backend/` 目录运行 Gradle wrapper。Windows 示例：

```powershell
.\gradlew.bat :monitoring-service:test
.\gradlew.bat build
```

其他模块的定向测试使用对应模块名；Linux/macOS 将 `.\gradlew.bat` 换成 `./gradlew`。启动顺序和联调方式见仓库根目录 `README.md`。
