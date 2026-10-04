import { toolInventory } from '@/features/tool-management/mock/data'
import type { NewToolInput, ToolInventoryStats, ToolListQuery, ToolPageResult, ToolRecord } from '@/features/tool-management/types'

const wait = (ms = 220) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
let measureSequence = 0

const clone = <T>(value: T): T => structuredClone(value)

export const toolService = {
  async list(query: ToolListQuery): Promise<ToolPageResult> {
    await wait()
    const keyword = query.keyword.trim().toLocaleLowerCase()
    const filtered = toolInventory.filter((tool) => {
      const matchesType = query.type === 'all' || tool.type === query.type
      const matchesKeyword = !keyword || `${tool.id} ${tool.name} ${tool.specification}`.toLocaleLowerCase().includes(keyword)
      return matchesType && matchesKeyword
    })
    const start = (query.page - 1) * query.pageSize
    return { items: clone(filtered.slice(start, start + query.pageSize)), total: filtered.length }
  },

  async stats(): Promise<ToolInventoryStats> {
    await wait(120)
    return {
      total: toolInventory.length,
      inUse: toolInventory.filter(tool => tool.usageStatus === 'in-use').length,
      needsMeasurement: toolInventory.filter(tool => tool.usageStatus === 'service').length,
      needsReplacement: toolInventory.filter(tool => tool.wearStage === 'replace').length,
    }
  },

  async measure(id: string): Promise<ToolRecord> {
    await wait(480)
    const tool = toolInventory.find(item => item.id === id)
    if (!tool) throw new Error('找不到这把刀具，请刷新列表后重试。')
    measureSequence += 1
    tool.wearMm = Math.min(0.42, Number((tool.wearMm + (measureSequence % 2 ? 0.012 : 0.008)).toFixed(3)))
    tool.wearStage = tool.wearMm >= tool.wearThresholdMm ? 'replace' : tool.wearMm >= 0.22 ? 'warning' : 'normal'
    if (tool.usageStatus === 'service') tool.usageStatus = 'standby'
    tool.updatedAt = `2026-10-04 15:${String(10 + measureSequence).padStart(2, '0')}`
    const at = tool.updatedAt
    tool.actualTrend.push({ at, wearMm: tool.wearMm })
    tool.predictionTrend.push({ at, wearMm: Number((tool.wearMm + (tool.wearStage === 'normal' ? 0.025 : 0.04)).toFixed(3)) })
    tool.suggestions = tool.wearStage === 'replace'
      ? ['测量结果已达到磨损阈值，请更换刀具', '检查工件表面质量并记录换刀批次', '建议将该刀具转入维护状态']
      : ['测量结果已更新，磨损仍在可用区间', '依据本次趋势建议缩短下一次测量间隔', '加工参数可保持当前设置并持续观察']
    return clone(tool)
  },

  async add(input: NewToolInput): Promise<ToolRecord> {
    await wait(300)
    const nextNumber = Math.max(0, ...toolInventory.map(tool => Number(tool.id.slice(1)))) + 1
    const id = `T${String(nextNumber).padStart(3, '0')}`
    const created: ToolRecord = {
      ...input,
      id,
      mileageKm: 0,
      loadedAt: '2026-10-04 15:20',
      lastUsedAt: '—',
      usageStatus: 'standby',
      wearMm: 0,
      wearStage: 'normal',
      updatedAt: '2026-10-04 15:20',
      wearThresholdMm: 0.3,
      actualTrend: [{ at: '2026-10-04 15:20', wearMm: 0 }],
      predictionTrend: [{ at: '2026-10-04 15:20', wearMm: 0.02 }],
      suggestions: ['新刀具尚未投入使用，首次加工后建议测量', '装载前确认夹持和跳动状态', '开始加工后记录基准磨损值'],
    }
    toolInventory.unshift(created)
    return clone(created)
  },

  async remove(id: string): Promise<void> {
    await wait(260)
    const index = toolInventory.findIndex(tool => tool.id === id)
    if (index < 0) throw new Error('刀具已不存在，请刷新列表后重试。')
    toolInventory.splice(index, 1)
  },
}
