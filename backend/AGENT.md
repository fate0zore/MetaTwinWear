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
  filter/
  service/
    impl/
  mapper/
  config/
    exception/
  model/
    dto/
    entity/
```

定时任务、模拟器等有独立职责的代码可以使用 `scheduler/`、`simulation/` 等包；没有相应代码时不创建空目录。

### 必须

- `controller` 负责 HTTP 路由、请求绑定、入口校验和响应适配；通过 `service` 完成业务操作，不直接访问 `mapper`。
- `service` 负责业务规则、流程编排和事务边界；涉及并发状态的操作保持必要的同步与一致性，不把业务决策放进 Controller 或 Mapper。
- `service` 包定义业务接口；实现类统一放在 `service/impl`，并以 `Impl` 结尾。调用方依赖接口，不直接依赖实现类。
- Servlet Filter 放在独立的 `filter` 包；全局异常处理器（如 `@RestControllerAdvice`）放在 `config/exception`。两者都不放在 `controller` 包。
- `mapper` 负责 MyBatis-Plus 映射及数据查询、写入，不承载业务流程。`model/entity` 表示持久化模型；`model/dto` 表示接口请求和响应模型，不将数据库实体直接作为对外响应。
- `config` 放置 Spring 配置、组件装配和配置选项管理等配置职责；全局异常处理器统一放入其 `exception` 子包。除该异常处理职责外，不在 `config` 放置控制器路由或数据访问逻辑。

### 应该

- 优先采用构造器注入。接口模型、持久化模型及其转换各守住边界，避免因数据库字段变化意外改变 API。
- 保持依赖方向清晰：Controller 调用 Service，Service 使用 Mapper；跨层调用应有明确职责原因。

`monitoring-service` 的控制器、过滤器、全局异常处理器、接口模型、业务服务及其实现、Mapper、持久化实体和定时任务已按上述职责归位。后续新增代码沿用此结构；模拟器等有独立职责的代码可以保留专用包。

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

- 所有 `/api/v1/**` 的 JSON 成功和错误响应必须使用 `com.metatwinwear.common.response.ApiResponse<T>`，字段固定为 `code`、`message`、`success`、`data`；`code` 必须与 HTTP 状态码一致，失败时 `data` 为 `null`。业务结果放在 `data` 中，不返回裸业务 JSON，也不另建响应包装格式。
- 成功响应使用 `ApiResponse.success(...)`，失败响应使用 `ApiResponse.failure(ApiStatus, ...)`；状态码和默认消息统一维护在 `ApiStatus`，未知状态码应明确报错。请求参数、业务校验及异常由统一异常处理链生成安全且明确的失败消息；未知异常不得向客户端暴露堆栈或内部实现细节。
- 图片成功响应保持 `image/jpeg` 二进制格式，图片错误使用统一 JSON 响应；SSE HTTP 流保持 `text/event-stream`，`snapshot` 和 `heartbeat` 事件数据使用 `ApiResponse` JSON 包装。Actuator、Eureka 等基础设施端点不属于该包装范围。
- 接口变更同步更新 `backend/openapi.yaml`，保持 `/api/v1/**` 网关路由，并核对网关和业务服务的成功、错误响应均符合上述格式。
- 请求结构在入口使用 Bean Validation 等机制校验，涉及业务状态的约束由 Service 校验；错误信息应明确且不泄露内部实现细节。
- 数据库结构变更通过 `monitoring-service/src/main/resources/db/migration/` 下新的 Flyway 版本化脚本实施，不修改已经应用的迁移脚本。
- 当前业务数据使用 SQLite。遵守 `DATA_MIGRATION.md` 中的字段、ID、时间戳及关系约定；同一数据库文件只由一个业务服务实例写入。

### 应该

- 保持事务归属于业务操作，并为数据库相关测试使用隔离的测试数据，避免依赖本地运行数据库。
- 修改接口前核对前端调用和 `openapi.yaml`，修改持久化前核对现有迁移与历史数据兼容性。

## 6. 命名与代码格式规范

### 必须

- 类、接口、枚举和注解使用大驼峰（UpperCamelCase）；DO、DTO、VO 等后缀保持大写。方法、变量和参数使用小驼峰（lowerCamelCase）；常量使用全大写并以下划线分隔单词，例如 `MAX_RETRY_COUNT`；包名全小写。
- 抽象类以 `Abstract` 或 `Base` 开头，异常类以 `Exception` 结尾，测试类以 `Test` 结尾，实现类以 `Impl` 结尾。POJO 布尔变量不加 `is` 前缀；禁止拼音、中英混搭及无意义命名。
- 统一使用4个空格缩进，禁止使用 Tab；单行不超过120个字符。左大括号不换行，右大括号前换行，`else`、`catch`、`finally` 与对应右大括号同行。
- `if`、`for`、`while` 等关键字与括号之间留空格，运算符两侧留空格；源文件使用 UTF-8 编码和 Unix 换行符。

## 7. 工程结构与分层架构

### 必须

- 严格遵循 Controller → Service → ServiceImpl → Mapper → XML 调用链，禁止跨层调用或私自新建中间层。
- Controller 仅负责接收请求、参数校验、路由和统一响应，不写业务逻辑或直接访问 Mapper。
- Service 定义业务契约；ServiceImpl 负责业务编排、事务控制和 DTO 转换。
- Mapper/DAO 仅负责数据库 CRUD 操作，不编写业务 SQL。
- DO（数据库实体）、DTO（数据传输对象）和 VO（视图对象）严格分离，禁止跨层直接传递实体或直接返回数据库实体。
- 使用 Maven 或 Gradle 统一管理依赖；线上应用禁止依赖 SNAPSHOT 版本。

## 8. 核心编程规约

### 必须

- 覆写方法添加 `@Override`；禁止使用过时 API。调用 `equals` 时使用常量作为调用方或使用 `Objects.equals`；整型包装类使用 `equals` 比较；循环内进行字符串拼接时使用 `StringBuilder`；构造方法不加入业务逻辑。
- 重写 `equals` 时必须同时重写 `hashCode`；禁止将 `subList` 强转为 `ArrayList`；foreach 中禁止调用 `remove` 或 `add`，需要修改集合时使用 `Iterator`。
- 返回集合时不得返回 `null`，无数据时返回空集合；遍历 Map 时优先使用 `entrySet`。
- 禁止使用 `new Thread()` 创建线程，使用线程池；禁止使用 `Executors` 工厂方法，使用参数明确的 `ThreadPoolExecutor`；线程池指定有意义的名称。
- 禁止使用 static 且无锁保护的 `SimpleDateFormat`；锁的粒度应尽量小。

## 9. 异常、日志与安全

### 必须

- 禁止用异常控制流程；`catch` 必须处理异常，禁止空吞；`finally` 中禁止 `return`，资源管理优先使用 try-with-resources。
- 禁止直接抛出 `RuntimeException` 或 `Exception`，使用项目业务异常；系统异常由全局异常处理器兜底。
- 统一使用 SLF4J 门面，日志参数使用 `{}` 占位符而非字符串拼接；异常日志必须包含堆栈。禁止打印密码、身份证等敏感信息；日志文件至少保存15天。
- SQL 使用 `#{}` 绑定参数预编译，禁止使用 `${}` 拼接 SQL；所有用户输入必须校验非空、长度和格式。
- 密码、身份证等敏感数据禁止明文存储，必须加密或脱敏；文件上传必须校验类型、大小并使用白名单。

## 10. MySQL 数据库规范

本节适用于使用 MySQL 的模块；当前业务数据使用 SQLite，仍应遵循第5节及 `DATA_MIGRATION.md` 中的相关约定。

### 必须

- 数据表包含 `id`、`create_time` 和 `update_time` 字段；主键使用自增 `bigint`，禁止使用 UUID；小数使用 `decimal`，禁止使用 `float` 或 `double`。
- 禁止使用 `select *`，查询必须列明字段；分页查询必须使用 `limit`。
- 索引遵循最左前缀原则；禁止在索引列上使用函数或隐式类型转换；批量操作使用 `BatchExecutor`。

## 11. 协作与版本控制

### 必须

- 采用 GitFlow 或 GitLab Flow 管理分支，划分 `main`（生产基准）、`develop`（开发集成）、`feature/*`（新功能）、`hotfix/*`（紧急修复）等分支；feature 分支开发周期不超过2周。
- 代码评审（CR）结合 CheckStyle、SonarQube 等自动化前置检查与人工评审。MR 关联需求 ID，并注明核心修改点和测试覆盖率。
- 类、接口和公共方法使用 Javadoc，说明功能，并根据方法签名补充 `@param`、`@return` 和 `@throws`；禁止保留大段注释掉的废代码。

## 12. 验证命令

在 `backend/` 目录运行 Gradle wrapper。Windows 示例：

```powershell
.\gradlew.bat :monitoring-service:test
.\gradlew.bat build
```

其他模块的定向测试使用对应模块名；Linux/macOS 将 `.\gradlew.bat` 换成 `./gradlew`。启动顺序和联调方式见仓库根目录 `README.md`。
