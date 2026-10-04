# Dashboard module notes

## Routes and views

`routes.ts` defines the named, lazy-loaded routes and titles:

| Route | View |
| --- | --- |
| `/tool-management` | `src/views/ToolManagementView.vue` |
| `/visual-monitor` | `src/views/VisualMonitorView.vue` |
| `/model-optimization` | `src/views/ModelOptimizationView.vue` |

`src/router/index.ts` registers these records. `DashboardHeader.vue` uses the shared route constants for its navigation links. Visual review carries the linked `recordId` to model optimization in the query string.

## Shared UI and data flow

The views compose the existing `DashboardHeader`, `DashboardPanel`, and `BaseChart` with `shared/components/ModuleStats.vue` and `shared/components/AgentChat.vue`. `DashboardPanel` can opt into Element Plus collapse behavior for the three statistics panels, which start expanded; its stylesheet in `src/styles/modules/dashboard-panel-collapse.scss` only handles the heading layout. Shared Element Plus colors, control states, typography, and scrollbars are configured once in `src/styles/theme/` and imported by `main.ts`; page styles under `src/styles/modules/` own layout, sizing, and business states. The teleported visual review dialog inherits the global dark theme; `visual-monitor-dialog.scss` only contains its image and form layout.

```text
view → feature composable → feature service → mock/data.ts
```

- Tool management: `ToolRecord` separates usage status from wear stage and stores timestamped measured and predicted trend points.
- Visual monitoring: `VisualBatch` and `VisualSample` link batches, samples, and optimization records. Detection boxes use normalized `x`, `y`, `width`, and `height` coordinates.
- Model optimization: `OptimizationRecord` contains timestamped `OptimizationTimePoint` entries with process parameters, hardware signals, and measured/predicted wear.

Mock entry points are `toolService.ts`, `visualService.ts`, and `optimizationService.ts`; their matching data lives under each feature's `mock/data.ts`. Mutations remain in memory for the current application session.

## Replacing mock services

Keep each service's typed method signatures and replace its mock reads/mutations with the corresponding API adapter. Put HTTP request and `ApiResponse<T>` unwrapping at that service boundary; keep views and composables dependent on business types and service results. The current modules do not require a running backend.
