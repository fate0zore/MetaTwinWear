import type { ToolProduct } from '@/features/tool-management/mock/catalog'
import { mockToolTypes, toolProductCatalog } from '@/features/tool-management/mock/catalog'
import type { ToolRecord, ToolWearStage } from '@/features/tool-management/types'

const trendTimes = [
  '2026-10-04 10:00', '2026-10-04 10:30', '2026-10-04 11:00', '2026-10-04 11:30',
  '2026-10-04 12:00', '2026-10-04 12:30', '2026-10-04 13:00', '2026-10-04 13:30',
]
const wearSamples = [0.18, 0.12, 0.08, 0.27, 0.31, 0.15, 0.22, 0.1, 0.34, 0.17, 0.06, 0.24]

function dateAtDay(day: number): string {
  return new Date(Date.UTC(2026, 8, day)).toISOString().slice(0, 10)
}

function wearStage(wearMm: number): ToolWearStage {
  return wearMm >= 0.3 ? 'replace' : wearMm >= 0.22 ? 'warning' : 'normal'
}

function createTool(product: ToolProduct, index: number): ToolRecord {
  const wearMm = wearSamples[index % wearSamples.length]
  const actualTrend = trendTimes.map((at, pointIndex) => ({
    at,
    wearMm: Number((wearMm * (0.46 + pointIndex * 0.075)).toFixed(3)),
  }))
  const predictionTrend = [
    ...actualTrend.slice(0, 5),
    ...trendTimes.slice(5).map((at, extraIndex) => ({
      at,
      wearMm: Number((actualTrend[4].wearMm + (extraIndex + 1) * (wearMm > 0.25 ? 0.032 : 0.023)).toFixed(3)),
    })),
  ]

  return {
    id: `T${String(index + 1).padStart(3, '0')}`,
    name: product.name,
    model: product.model,
    type: product.type,
    specification: product.specification,
    material: product.material,
    coatingLabel: product.coatingLabel,
    coating: product.coating,
    applications: product.applications,
    compatibleMaterials: product.compatibleMaterials,
    sourceUrl: product.sourceUrl,
    loadedAt: `${dateAtDay(18 + (index % 13))} 08:30`,
    mileageKm: 1280 + index * 147,
    lastUsedAt: `2026-10-0${1 + (index % 4)} ${String(14 + Math.floor(index / 10)).padStart(2, '0')}:${String((8 + index * 3) % 60).padStart(2, '0')}`,
    usageStatus: index % 4 === 0 ? 'in-use' : index % 5 === 0 ? 'service' : 'standby',
    imageUrl: product.imageUrl,
    wearMm,
    wearStage: wearStage(wearMm),
    updatedAt: `2026-10-04 14:${String((12 + index * 2) % 60).padStart(2, '0')}`,
    wearThresholdMm: 0.3,
    actualTrend,
    predictionTrend,
    suggestions: wearMm >= 0.3
      ? ['达到磨损阈值，建议安排换刀', '检查刀杆夹持与切削液供应', '该刀具暂不建议继续高负荷加工']
      : wearMm >= 0.22
        ? ['进入加速磨损观察区间', '建议降低进给负载并缩短复测间隔', '预计约 2 小时后需要再次测量']
        : ['当前磨损处于稳定范围，可继续加工', '建议加工 3 小时后再次测量', '加工参数可按当前设置持续观察'],
  }
}

const productGroups = mockToolTypes.map((type) => toolProductCatalog.filter((product) => product.type === type))
const interleavedProducts: ToolProduct[] = []
for (let index = 0; index < Math.max(...productGroups.map((group) => group.length)); index += 1) {
  for (const group of productGroups) {
    const product = group[index]
    if (product) interleavedProducts.push(product)
  }
}

export const toolInventory: ToolRecord[] = interleavedProducts.map(createTool)
