import endMillImage from '@/assets/modules/cutter-tool.svg'
import type { ToolRecord, ToolType } from '@/features/tool-management/types'

const trendTimes = ['2026-10-04 10:00', '2026-10-04 10:30', '2026-10-04 11:00', '2026-10-04 11:30', '2026-10-04 12:00', '2026-10-04 12:30', '2026-10-04 13:00', '2026-10-04 13:30']
const names: Array<{ type: ToolType; spec: string; material: string; coating: string }> = [
  { type: '立铣刀', spec: 'Φ12 四刃立铣刀', material: '硬质合金', coating: 'TiAlN 涂层' },
  { type: '球头铣刀', spec: 'Φ10 球头铣刀', material: '硬质合金', coating: 'AlCrN 涂层' },
  { type: '立铣刀', spec: 'Φ8 两刃立铣刀', material: '高速钢', coating: 'TiN 涂层' },
  { type: '面铣刀', spec: 'Φ50 可转位面铣刀', material: '硬质合金', coating: '无涂层' },
  { type: '钻头', spec: 'Φ6 麻花钻', material: '硬质合金', coating: 'TiAlN 涂层' },
  { type: '立铣刀', spec: 'Φ16 四刃立铣刀', material: '硬质合金', coating: 'TiAlN 涂层' },
]

function createTool(index: number): ToolRecord {
  const definition = names[index % names.length]
  const wearMm = [0.18, 0.12, 0.08, 0.27, 0.31, 0.15, 0.22, 0.1, 0.34, 0.17, 0.06, 0.24][index]
  const actualTrend = trendTimes.map((at, pointIndex) => ({ at, wearMm: Number((wearMm * (0.46 + pointIndex * 0.075)).toFixed(3)) }))
  const predictionTrend = [
    ...actualTrend.slice(0, 5),
    ...trendTimes.slice(5).map((at, extraIndex) => ({ at, wearMm: Number((actualTrend[4].wearMm + (extraIndex + 1) * (wearMm > 0.25 ? 0.032 : 0.023)).toFixed(3)) })),
  ]
  return {
    id: `T${String(index + 1).padStart(3, '0')}`,
    name: `刀具 ${index + 1}`,
    type: definition.type,
    specification: definition.spec,
    material: definition.material,
    coating: definition.coating,
    loadedAt: `2026-09-${String(18 + index).padStart(2, '0')} 08:30`,
    mileageKm: 1280 + index * 147,
    lastUsedAt: `2026-10-0${Math.min(4, 1 + Math.floor(index / 3))} 14:${String(8 + index * 3).padStart(2, '0')}`,
    usageStatus: index % 4 === 0 ? 'in-use' : index % 5 === 0 ? 'service' : 'standby',
    imageUrl: endMillImage,
    wearMm,
    wearStage: wearMm >= 0.3 ? 'replace' : wearMm >= 0.22 ? 'warning' : 'normal',
    updatedAt: `2026-10-04 14:${String(12 + index).padStart(2, '0')}`,
    wearThresholdMm: 0.3,
    actualTrend,
    predictionTrend,
    suggestions: wearMm >= 0.3
      ? ['达到磨损阈值，建议安排换刀', '检查刀柄夹持与切削液供给', '该刀具暂不建议继续高负荷加工']
      : wearMm >= 0.22
        ? ['进入加速磨损观察区间', '建议降低进给负载并缩短复测间隔', '预计约 2 小时后需要再次测量']
        : ['当前磨损处于稳定范围，可继续加工', '建议加工 3 小时后再次测量', '主轴转速 12,000 rpm，进给 800 mm/min'],
  }
}

export const toolInventory: ToolRecord[] = Array.from({ length: 12 }, (_, index) => createTool(index))
