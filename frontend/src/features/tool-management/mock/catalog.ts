import type { ToolType } from '@/features/tool-management/types'
import type { ToolConfig } from '@/types/dashboard'

import coromill390Image from '@/assets/tools/catalog/inserts/coromill-390.png'
import plura2f365Image from '@/assets/tools/catalog/milling/plura-2f365.jpg'
import plura2f366Image from '@/assets/tools/catalog/milling/plura-2f366.jpg'
import ms20_16Image from '@/assets/tools/catalog/milling/ms20-16.jpg'
import ms20_20Image from '@/assets/tools/catalog/milling/ms20-20.jpg'
import ms20_30Image from '@/assets/tools/catalog/milling/ms20-30.jpg'
import boringBarImage from '@/assets/tools/catalog/turning/boring-bar.png'
import cuttingUnitImage from '@/assets/tools/catalog/turning/cutting-unit.png'
import qsShankImage from '@/assets/tools/catalog/turning/qs-shank.png'
import shankHolderImage from '@/assets/tools/catalog/turning/shank-holder.png'

export interface ToolProduct {
  name: string
  model: string
  type: ToolType
  specification: string
  material: string
  coatingLabel: string
  coating: string
  applications: string
  compatibleMaterials: string
  imageUrl: string
  sourceUrl: string
  diameter?: number
  length?: number
  toothCount?: number
}

const sandvikProductUrl = (model: string) =>
  `https://www.sandvik.coromant.com/en-gb/product-details?c=${encodeURIComponent(model)}`

const solidMill = (
  model: string,
  diameter: number,
  length: number,
  imageUrl: string,
  name = 'CoroMill® Plura 整体式立铣刀',
): ToolProduct => ({
  name,
  model,
  type: '铣刀',
  specification: `直径 ${diameter} mm · 总长 ${length} mm · 4 齿 · 整体式`,
  material: '硬质合金',
  coatingLabel: '牌号',
  coating: '1745',
  applications: '高进给侧铣',
  compatibleMaterials: 'ISO M / S（钛合金为主要应用）',
  imageUrl,
  sourceUrl: sandvikProductUrl(model),
  diameter,
  length,
  toothCount: 4,
})

const indexableMill = (
  model: string,
  diameter: number,
  length: number,
  imageUrl: string,
): ToolProduct => ({
  name: 'CoroMill® MS20 可转位立铣刀',
  model,
  type: '铣刀',
  specification: `直径 ${diameter} mm · 总长 ${length} mm · 2 齿 · 可转位`,
  material: '钢制刀体（配可转位刀片）',
  coatingLabel: '刀片牌号',
  coating: '需按工件材料选配',
  applications: '方肩铣削',
  compatibleMaterials: '取决于所配刀片牌号',
  imageUrl,
  sourceUrl: sandvikProductUrl(model),
  diameter,
  length,
  toothCount: 2,
})

const millingProducts: ToolProduct[] = [
  solidMill('2F365-0600-050-TD 1745', 6, 66, plura2f365Image),
  solidMill('2F365-0800-050-TD 1745', 8, 73, plura2f365Image),
  solidMill('2F366-1000-050-TD 1745', 10, 87, plura2f366Image),
  solidMill('2F366-1200-050-TD 1745', 12, 103, plura2f366Image),
  solidMill('2F366-1600-050-TD 1745', 16, 124, plura2f366Image),
  solidMill('2F366-2000-050-TD 1745', 20, 142, plura2f366Image),
  solidMill('2F366-2500-050-TD 1745', 25, 170, plura2f366Image),
  indexableMill('MS20-R016A16-10L', 16, 100, ms20_16Image),
  indexableMill('MS20-R020A20L-10L', 20, 170, ms20_20Image),
  indexableMill('MS20-R030A25L-10L', 30, 210, ms20_30Image),
]

const insertProduct = (model: string, grade: '1025' | '1130'): ToolProduct => ({
  name: 'CoroMill® 390 铣刀片',
  model,
  type: '铣刀片',
  specification: 'CoroMill 390 · 11 号刀片 · PM 几何 · 硬质合金',
  material: '硬质合金',
  coatingLabel: '材质与涂层',
  coating: grade === '1025' ? '1025 · PVD TiCN + TiN' : '1130 · PVD AlTiCrN',
  applications: 'CoroMill 390 肩部铣削与侧铣',
  compatibleMaterials: grade === '1025' ? 'ISO P / M / K / N / S / H' : 'ISO P / M / N / S / H',
  imageUrl: coromill390Image,
  sourceUrl: sandvikProductUrl(model),
})

const insertProducts: ToolProduct[] = [
  insertProduct('R390-11 T3 02E-PM 1025', '1025'),
  insertProduct('R390-11 T3 04M-PM 1025', '1025'),
  insertProduct('R390-11 T3 08M-PM 1025', '1025'),
  insertProduct('R390-11 T3 08M-PM 1130', '1130'),
  insertProduct('R390-11 T3 12E-PM 1025', '1025'),
  insertProduct('R390-11 T3 16E-PM 1025', '1025'),
  insertProduct('R390-11 T3 16M-PM 1025', '1025'),
  insertProduct('R390-11 T3 20E-PM 1025', '1025'),
  insertProduct('R390-11 T3 24E-PM 1025', '1025'),
  insertProduct('R390-11 T3 31M-PM 1025', '1025'),
]

const turningProduct = (
  model: string,
  specification: string,
  imageUrl: string,
  applications: string,
): ToolProduct => ({
  name: model.startsWith('A') ? 'CoroTurn® 内孔车削刀杆' : 'CoroTurn® 车削刀杆',
  model,
  type: '车刀',
  specification,
  material: '钢制刀杆',
  coatingLabel: '适配刀片',
  coating: '请按工件材料选配',
  applications,
  compatibleMaterials: '取决于所配刀片牌号',
  imageUrl,
  sourceUrl: sandvikProductUrl(model),
})

const turningProducts: ToolProduct[] = [
  turningProduct('SDJCR 2525M 11', '方柄 25 × 25 mm · 功能长度 150 mm · 右手 · DCMT 11T308', shankHolderImage, '外圆车削'),
  turningProduct('STFCR 2525M 16', '方柄 25 × 25 mm · 功能长度 150 mm · 右手', shankHolderImage, '外圆车削与仿形车削'),
  turningProduct('A08H-STUCL 06-GR', '刀杆直径 8 mm · 功能长度 100 mm · 内孔车削', boringBarImage, '内孔车削'),
  turningProduct('SVJBR 1212K 16-S', '方柄 12 × 12 mm · 功能长度 125 mm · 右手', shankHolderImage, '外圆车削与仿形车削'),
  turningProduct('SRDCN 2525M 10-A', '方柄 25 × 25 mm · 功能长度 150 mm', shankHolderImage, '外圆车削'),
  turningProduct('A12S-SCLCL 3', '连接直径 19.05 mm · 功能长度 254 mm · 内孔车削', boringBarImage, '内孔车削'),
  turningProduct('SDJCR 2020K 11', '方柄 20 × 20 mm · 功能长度 125 mm · 右手 · DCMT 11T308', shankHolderImage, '外圆车削'),
  turningProduct('QS-SDJCR 16 3C', 'QS 方柄 25.4 × 25.4 mm · 功能长度 113 mm', qsShankImage, '快速换刀外圆车削'),
  turningProduct('A12S-SVUBL 2-E', '连接直径 19.05 mm · 功能长度 254 mm · 内孔车削', boringBarImage, '内孔仿形车削'),
  turningProduct('C5-SCLCR-11070-09', 'C5 接口 · 连接直径 50 mm · 功能长度 70 mm · 宽度 11 mm', cuttingUnitImage, '模块化外圆车削'),
]

export const toolProductCatalog: ToolProduct[] = [
  ...insertProducts,
  ...millingProducts,
  ...turningProducts,
]

export const mockToolTypes: ToolType[] = ['铣刀片', '铣刀', '车刀']

export function findToolProduct(model: string): ToolProduct | undefined {
  return toolProductCatalog.find((product) => product.model === model)
}

export function toMockToolConfig(product: ToolProduct): ToolConfig {
  return {
    model: product.model,
    type: product.type,
    diameter: product.diameter ?? null,
    length: product.length ?? null,
    toothCount: product.toothCount ?? null,
    material: product.material,
  }
}
