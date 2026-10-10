<template>
  <div class="settings-shell">
    <DashboardHeader />
    <main class="settings-main">
      <div class="settings-heading">
        <div>
          <p class="settings-eyebrow">ACCOUNT &amp; PREFERENCES</p>
          <h1>系统设置</h1>
          <p>管理个人资料、通知和工作偏好。</p>
        </div>
        <span class="settings-user-chip"><el-icon><User /></el-icon>{{ store.settings.profile.role }}</span>
      </div>

      <el-alert v-if="store.storageWarning" :title="store.storageWarning" type="warning" show-icon :closable="false" class="settings-storage-alert" />

      <div class="settings-layout">
        <nav class="settings-nav" aria-label="设置分类">
          <button v-for="item in sections" :key="item.id" type="button" :class="['settings-nav-item', { active: activeSection === item.id }]" :aria-current="activeSection === item.id ? 'page' : undefined" @click="activeSection = item.id">
            <el-icon><component :is="item.icon" /></el-icon><span>{{ item.label }}</span><el-icon class="settings-nav-arrow"><ArrowRight /></el-icon>
          </button>
          <div class="settings-nav-footer"><span class="settings-status-dot"></span>{{ dirty ? '有未保存的修改' : '设置已同步' }}</div>
        </nav>

        <section class="settings-content" :aria-labelledby="`settings-section-${activeSection}`">
          <DashboardPanel v-if="activeSection === 'profile'" title="个人资料" :icon="User" class="settings-panel">
            <div class="settings-panel-intro"><h2 id="settings-section-profile">个人资料</h2><p>更新你的个人联系信息，账号与角色由系统分配。</p></div>
            <el-form ref="profileForm" :model="draft.profile" :rules="profileRules" label-position="top" class="settings-form" @submit.prevent>
              <div class="settings-form-grid">
                <el-form-item label="账号" class="readonly-field"><el-input :model-value="auth.requiresLogin && auth.authenticated ? auth.account : draft.profile.account" disabled><template #prefix><el-icon><User /></el-icon></template></el-input></el-form-item>
                <el-form-item label="用户角色" class="readonly-field"><el-input :model-value="draft.profile.role" disabled /></el-form-item>
                <el-form-item label="姓名" prop="name" required><el-input v-model="draft.profile.name" maxlength="40" show-word-limit placeholder="请输入姓名" /></el-form-item>
                <el-form-item label="所属部门" prop="department"><el-input v-model="draft.profile.department" maxlength="60" placeholder="请输入部门名称" /></el-form-item>
                <el-form-item label="邮箱" prop="email"><el-input v-model="draft.profile.email" maxlength="120" placeholder="name@example.com"><template #prefix><el-icon><Message /></el-icon></template></el-input></el-form-item>
                <el-form-item label="手机号" prop="phone"><el-input v-model="draft.profile.phone" maxlength="11" placeholder="选填"><template #prefix><el-icon><Iphone /></el-icon></template></el-input></el-form-item>
              </div>
              <div class="settings-inline-note"><el-icon><InfoFilled /></el-icon><span>账号和角色只读，其他资料修改后点击页面底部“保存设置”生效。</span></div>
            </el-form>
          </DashboardPanel>

          <DashboardPanel v-else-if="activeSection === 'notifications'" title="通知偏好" :icon="Bell" class="settings-panel">
            <div class="settings-panel-intro"><h2 id="settings-section-notifications">通知偏好</h2><p>自定义你希望看到的站内消息提示。</p></div>
            <div class="settings-setting-row settings-master-row"><div class="settings-setting-copy"><strong>启用站内通知</strong><span>关闭后将隐藏下方所有通知类型。</span></div><el-switch v-model="draft.notifications.enabled" aria-label="启用站内通知" /></div>
            <div class="settings-setting-list" :class="{ disabled: !draft.notifications.enabled }">
              <div class="settings-setting-row"><div class="settings-setting-copy"><strong>磨损预警</strong><span>刀具磨损状态达到预警条件时提醒。</span></div><el-switch v-model="draft.notifications.wearWarning" :disabled="!draft.notifications.enabled" aria-label="磨损预警通知" /></div>
              <div class="settings-setting-row"><div class="settings-setting-copy"><strong>视觉检测完成</strong><span>图像批次检测处理完成时提醒。</span></div><el-switch v-model="draft.notifications.visionComplete" :disabled="!draft.notifications.enabled" aria-label="视觉检测完成通知" /></div>
              <div class="settings-setting-row"><div class="settings-setting-copy"><strong>模型优化完成</strong><span>模型训练或优化任务完成时提醒。</span></div><el-switch v-model="draft.notifications.optimizationComplete" :disabled="!draft.notifications.enabled" aria-label="模型优化完成通知" /></div>
            </div>
            <div class="settings-duration-row"><div class="settings-setting-copy"><strong>提示显示时长</strong><span>测试通知将在指定时间后自动关闭。</span></div><el-select v-model="draft.notifications.durationSeconds" aria-label="提示显示时长" :disabled="!draft.notifications.enabled" class="settings-duration-select"><el-option :value="3" label="3 秒" /><el-option :value="5" label="5 秒" /><el-option :value="8" label="8 秒" /></el-select></div>
            <div class="settings-test-row"><div><strong>测试通知</strong><p>选择通知类型，预览当前偏好下的提示效果。</p><p class="settings-mock-note">业务通知接入后，将按上述偏好展示。</p></div><div class="settings-test-controls"><el-select v-model="testNotificationType" aria-label="测试通知类型" class="settings-test-select"><el-option v-for="item in notificationTypes" :key="item.key" :label="item.label" :value="item.key" /></el-select><el-button type="primary" :disabled="!canTestNotification" :icon="Bell" @click="showTestNotification">发送测试</el-button></div></div>
          </DashboardPanel>

          <DashboardPanel v-else-if="activeSection === 'work'" title="工作偏好" :icon="Monitor" class="settings-panel">
            <div class="settings-panel-intro"><h2 id="settings-section-work">工作偏好</h2><p>设置打开系统时的默认页面和当前工作机床。</p></div>
            <div class="settings-preference-card"><div class="settings-preference-icon"><el-icon><House /></el-icon></div><div class="settings-setting-copy"><strong>默认进入页面</strong><span>访问系统根路径时自动打开此页面；直接访问其他页面时仍按链接打开。</span></div><el-select v-model="draft.preferences.defaultRoute" aria-label="默认进入页面" class="settings-preference-select"><el-option v-for="page in SYSTEM_PAGES" :key="page.value" :label="page.label" :value="page.value" /></el-select></div>
            <div class="settings-preference-card"><div class="settings-preference-icon"><el-icon><Cpu /></el-icon></div><div class="settings-setting-copy"><strong>工作机床</strong><span>保存后与页面顶部的在线机床选择器同步。</span><small v-if="draft.preferences.machineId === store.settings.preferences.machineId">当前选择：{{ selectedMachineLabel }}</small><small v-else>当前选择：{{ selectedMachineLabel }}（待保存）</small></div><el-select v-model="draft.preferences.machineId" aria-label="工作机床" class="settings-preference-select"><el-option v-for="machine in MACHINE_INSTANCES" :key="machine.id" :label="machine.label" :value="machine.id" /></el-select></div>
          </DashboardPanel>

          <DashboardPanel v-else title="本地数据管理" :icon="FolderOpened" class="settings-panel">
            <div class="settings-panel-intro"><h2 id="settings-section-data">本地数据管理</h2><p>设置数据保存在当前浏览器中，可导出或恢复默认偏好。</p></div>
            <div class="settings-data-card"><div class="settings-data-icon"><el-icon><Clock /></el-icon></div><div class="settings-setting-copy"><strong>最近保存时间</strong><span>{{ formattedSavedAt }}</span></div><el-tag v-if="store.settings.savedAt" type="success" effect="plain">已保存</el-tag><el-tag v-else effect="plain">默认设置</el-tag></div>
            <div class="settings-data-actions"><div class="settings-data-action"><div><strong>导出设置</strong><p>下载当前已保存的个人资料、通知和工作偏好 JSON 文件。</p></div><el-button :icon="Download" :loading="exporting" @click="exportSettings">导出 JSON</el-button></div><div class="settings-data-action"><div><strong>恢复默认偏好</strong><p>将通知与工作偏好恢复默认值，个人资料保持不变。保存后生效。</p></div><el-button :icon="RefreshLeft" :disabled="store.saving" @click="restoreDefaults">恢复默认</el-button></div></div>
            <div class="settings-inline-note"><el-icon><InfoFilled /></el-icon><span>恢复默认只会修改当前编辑草稿；点击“保存设置”后才会写入浏览器存储。</span></div>
          </DashboardPanel>

          <footer class="settings-save-bar">
            <div class="settings-save-status"><el-icon :class="dirty ? 'is-dirty' : ''"><component :is="dirty ? EditPen : CircleCheck" /></el-icon><span>{{ dirty ? '有尚未保存的修改' : lastSavedLabel }}</span></div>
            <div><el-button :disabled="!dirty || store.saving" @click="discardChanges">撤销修改</el-button><el-button type="primary" :icon="Check" :loading="store.saving" :disabled="!dirty" @click="saveChanges">保存设置</el-button></div>
          </footer>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElNotification, type FormInstance, type FormRules } from 'element-plus'
import { ArrowRight, Bell, Check, CircleCheck, Clock, Cpu, DataBoard, Download, EditPen, FolderOpened, House, InfoFilled, Iphone, Message, Monitor, RefreshLeft, User } from '@element-plus/icons-vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import { DEFAULT_USER_SETTINGS, cloneSettings } from '@/features/system-settings/mock/data'
import { useAuthStore } from '@/features/auth/stores/auth'
import { settingsService } from '@/features/system-settings/services/settingsService'
import { useSystemSettingsStore } from '@/features/system-settings/stores/systemSettings'
import { MACHINE_INSTANCES, SYSTEM_PAGES, type NotificationPreferences, type UserSettings } from '@/features/system-settings/types'

type SectionId = 'profile' | 'notifications' | 'work' | 'data'
type NotificationKey = 'wearWarning' | 'visionComplete' | 'optimizationComplete'
const sections = [
  { id: 'profile' as const, label: '个人资料', icon: User },
  { id: 'notifications' as const, label: '通知偏好', icon: Bell },
  { id: 'work' as const, label: '工作偏好', icon: Monitor },
  { id: 'data' as const, label: '本地数据管理', icon: DataBoard },
]
const notificationTypes: { key: NotificationKey; label: string; title: string; message: string }[] = [
  { key: 'wearWarning', label: '磨损预警', title: '刀具磨损预警', message: '当前刀具磨损已接近设定限制值，请及时检查。' },
  { key: 'visionComplete', label: '视觉检测完成', title: '视觉检测已完成', message: '批次 VM-2026-018 的视觉检测已完成。' },
  { key: 'optimizationComplete', label: '模型优化完成', title: '模型优化已完成', message: '模型优化任务 OPT-2026-006 已完成。' },
]

const store = useSystemSettingsStore()
const auth = useAuthStore()
const activeSection = ref<SectionId>('profile')
const profileForm = ref<FormInstance>()
const exporting = ref(false)
const draft = reactive<UserSettings>(cloneSettings(store.settings))
const initial = ref<UserSettings>(cloneSettings(store.settings))
const testNotificationType = ref<NotificationKey>('wearWarning')
const dirty = computed(() => JSON.stringify(draft) !== JSON.stringify(initial.value))
const selectedMachineLabel = computed(() => MACHINE_INSTANCES.find((machine) => machine.id === draft.preferences.machineId)?.label ?? '未选择')
const formattedSavedAt = computed(() => store.settings.savedAt ? new Date(store.settings.savedAt).toLocaleString('zh-CN') : '尚未保存，正在使用默认设置')
const lastSavedLabel = computed(() => store.settings.savedAt ? `上次保存于 ${formattedSavedAt.value}` : '所有设置已同步')
const selectedTestNotification = computed(() => notificationTypes.find((item) => item.key === testNotificationType.value)!)
const canTestNotification = computed(() => draft.notifications.enabled && draft.notifications[testNotificationType.value])

const profileRules: FormRules = {
  name: [
    { required: true, whitespace: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 40, message: '姓名长度需为 2 至 40 个字符', trigger: 'blur' },
  ],
  email: [{ validator: (_rule, value: string, callback) => {
    const email = String(value ?? '').trim()
    if (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) callback()
    else callback(new Error('请输入有效的邮箱地址'))
  }, trigger: 'blur' }],
  phone: [{ validator: (_rule, value: string, callback) => {
    const phone = String(value ?? '').trim()
    if (!phone || /^1[3-9]\d{9}$/.test(phone)) callback()
    else callback(new Error('请输入有效的 11 位中国大陆手机号'))
  }, trigger: 'blur' }],
}

watch(() => store.settings.preferences.machineId, (machineId) => {
  if (machineId === initial.value.preferences.machineId) return
  if (draft.preferences.machineId === initial.value.preferences.machineId) draft.preferences.machineId = machineId
  initial.value.preferences.machineId = machineId
})

function syncDraft(settings: UserSettings) {
  Object.assign(draft.profile, settings.profile)
  Object.assign(draft.notifications, settings.notifications)
  Object.assign(draft.preferences, settings.preferences)
  Object.assign(initial.value.profile, settings.profile)
  Object.assign(initial.value.notifications, settings.notifications)
  Object.assign(initial.value.preferences, settings.preferences)
  initial.value.savedAt = settings.savedAt
}

async function saveChanges() {
  const profile = draft.profile
  const invalidProfile = !profile.name.trim() || profile.name.trim().length < 2
    ? '姓名至少需要 2 个字符。'
    : profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
      ? '请输入有效的邮箱地址。'
      : profile.phone.trim() && !/^1[3-9]\d{9}$/.test(profile.phone.trim())
        ? '请输入有效的 11 位中国大陆手机号。'
        : ''
  if (invalidProfile) {
    activeSection.value = 'profile'
    ElMessage.warning(invalidProfile)
    return
  }

  try {
    await profileForm.value?.validate()
    const saved = await store.save({
      profile: { ...draft.profile },
      notifications: { ...draft.notifications },
      preferences: { ...draft.preferences },
    })
    syncDraft(saved)
    ElMessage.success('设置已保存')
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('validate')) ElMessage.error(error.message)
  }
}

function discardChanges() {
  syncDraft(cloneSettings(store.settings))
  profileForm.value?.clearValidate()
  ElMessage.info('已撤销未保存的修改')
}

function restoreDefaults() {
  Object.assign(draft.notifications, DEFAULT_USER_SETTINGS.notifications)
  Object.assign(draft.preferences, DEFAULT_USER_SETTINGS.preferences)
  ElMessage.info('默认偏好已载入草稿，请保存后生效')
}

function showTestNotification() {
  const selected = selectedTestNotification.value
  ElNotification({ title: selected.title, message: selected.message, type: 'warning', duration: draft.notifications.durationSeconds * 1000, position: 'top-right' })
}

async function exportSettings() {
  exporting.value = true
  try {
    const contents = await settingsService.exportSettings(cloneSettings(store.settings))
    const blob = new Blob([contents], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `metatwinwear-settings-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    ElMessage.success('设置文件已导出')
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

function confirmDiscard(): boolean {
  return auth.sessionExpired || !dirty.value || window.confirm('还有未保存的设置，确定离开并放弃修改吗？')
}

onBeforeRouteLeave(() => confirmDiscard())
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
window.addEventListener('beforeunload', onBeforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<style scoped lang="scss">
.settings-shell { min-height: 100vh; min-height: 100dvh; color: var(--text); background: radial-gradient(circle at 50% 12%, rgba(0, 102, 150, .13), transparent 38%), linear-gradient(135deg, #071822, #03101a 60%, #020910); }
.settings-main { width: min(1440px, 100%); margin: 0 auto; padding: 22px 24px 36px; }
.settings-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.settings-heading h1 { margin: 0; color: #e1f8ff; font-size: 24px; line-height: 1.35; }
.settings-heading > div > p:last-child { margin: 5px 0 0; color: #83aabc; font-size: 13px; }
.settings-eyebrow { margin: 0 0 4px; color: var(--cyan); font-size: 11px; letter-spacing: 1.4px; }
.settings-user-chip { display: flex; align-items: center; gap: 7px; padding: 7px 11px; border: 1px solid rgba(36, 129, 171, .42); color: #a9d5e3; background: rgba(5, 32, 52, .6); font-size: 12px; }
.settings-storage-alert { margin-bottom: 14px; --el-alert-bg-color: rgba(107, 71, 18, .28); --el-alert-border-color: rgba(244, 189, 72, .42); --el-alert-title-color: #ffdc91; }
.settings-layout { display: grid; grid-template-columns: 224px minmax(0, 1fr); gap: 16px; align-items: start; }
.settings-nav { position: sticky; top: 12px; display: grid; gap: 4px; padding: 8px; border: 1px solid rgba(36, 129, 171, .35); background: linear-gradient(145deg, rgba(5, 32, 52, .92), rgba(2, 18, 31, .94)); }
.settings-nav-item { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 0 11px; border: 1px solid transparent; color: #83aabd; background: transparent; font: inherit; font-size: 13px; text-align: left; cursor: pointer; transition: .18s ease; }
.settings-nav-item:hover, .settings-nav-item.active { border-color: rgba(24, 200, 255, .28); color: #d7f7ff; background: rgba(9, 91, 128, .3); }
.settings-nav-item.active { box-shadow: inset 2px 0 var(--cyan); }
.settings-nav-item > .el-icon:first-child { color: var(--cyan); font-size: 16px; }
.settings-nav-arrow { margin-left: auto; color: #6091a7; }
.settings-nav-footer { display: flex; align-items: center; gap: 8px; margin-top: 7px; padding: 12px 10px 5px; border-top: 1px solid rgba(36, 129, 171, .25); color: #7f9fae; font-size: 11px; }
.settings-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); }
.settings-content { display: grid; gap: 12px; min-width: 0; }
.settings-panel { min-width: 0; }
.settings-panel-intro { padding: 17px 18px 13px; }
.settings-panel-intro h2 { margin: 0; color: #d8f4fc; font-size: 16px; }
.settings-panel-intro p { margin: 5px 0 0; color: #80a9bb; font-size: 12px; line-height: 1.6; }
.settings-form { padding: 0 18px 18px; }
.settings-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 18px; }
.settings-form :deep(.el-form-item) { margin-bottom: 16px; }
.settings-form :deep(.el-form-item__label) { color: #9fc5d3; font-size: 12px; }
.settings-form :deep(.el-input__wrapper) { min-height: 38px; background: rgba(3, 21, 33, .85); box-shadow: 0 0 0 1px rgba(36, 129, 171, .36) inset; }
.settings-form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px var(--cyan) inset; }
.settings-form :deep(.readonly-field .el-input__wrapper) { background: rgba(7, 30, 45, .62); }
.settings-inline-note { display: flex; align-items: flex-start; gap: 8px; margin: 0 18px 17px; padding: 10px 11px; border: 1px solid rgba(36, 129, 171, .25); color: #83aebe; background: rgba(4, 38, 56, .45); font-size: 12px; line-height: 1.55; }
.settings-inline-note > .el-icon { flex: 0 0 auto; margin-top: 1px; color: var(--cyan); }
.settings-panel > .settings-inline-note { margin-top: 0; }
.settings-setting-row, .settings-duration-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 66px; padding: 12px 18px; border-top: 1px solid rgba(36, 129, 171, .2); }
.settings-master-row { margin: 0 18px 8px; padding: 12px; border: 1px solid rgba(24, 157, 195, .35); background: rgba(4, 43, 61, .45); }
.settings-setting-copy { display: grid; gap: 4px; min-width: 0; }
.settings-setting-copy strong, .settings-test-row strong { color: #c8e9f2; font-size: 13px; font-weight: 600; }
.settings-setting-copy span, .settings-test-row p, .settings-data-action p { margin: 0; color: #7fa5b6; font-size: 12px; line-height: 1.55; }
.settings-setting-copy small { color: #65d4ff; font-size: 11px; }
.settings-setting-list.disabled { opacity: .48; }
.settings-duration-row { margin-top: 3px; border-bottom: 1px solid rgba(36, 129, 171, .2); }
.settings-duration-select { width: 130px; }
.settings-test-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 16px 18px 18px; padding: 14px; border: 1px solid rgba(36, 129, 171, .28); background: rgba(3, 25, 39, .68); }
.settings-test-row p { margin-top: 4px; }
.settings-test-row .settings-mock-note { color: #688b9a; }
.settings-test-controls { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.settings-test-select { width: 152px; }
.settings-preference-card, .settings-data-card { display: grid; grid-template-columns: 40px minmax(0, 1fr) minmax(180px, 240px); align-items: center; gap: 13px; min-height: 90px; margin: 0 18px 12px; padding: 14px; border: 1px solid rgba(36, 129, 171, .28); background: rgba(3, 25, 39, .62); }
.settings-preference-icon, .settings-data-icon { display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid rgba(24, 200, 255, .3); color: var(--cyan); background: rgba(24, 200, 255, .08); font-size: 17px; }
.settings-preference-select { width: 100%; }
.settings-data-card { grid-template-columns: 40px minmax(0, 1fr) auto; }
.settings-data-card > .el-tag { justify-self: end; }
.settings-data-actions { margin: 20px 18px; border-top: 1px solid rgba(36, 129, 171, .22); }
.settings-data-action { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 82px; border-bottom: 1px solid rgba(36, 129, 171, .22); }
.settings-data-action strong { color: #c8e9f2; font-size: 13px; }
.settings-data-action p { margin-top: 5px; }
.settings-save-bar { position: sticky; bottom: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 58px; padding: 9px 12px; border: 1px solid rgba(36, 129, 171, .42); background: rgba(3, 20, 32, .96); box-shadow: 0 -8px 24px rgba(0, 0, 0, .2); backdrop-filter: blur(12px); }
.settings-save-bar > div:last-child { display: flex; gap: 8px; }
.settings-save-status { display: flex; align-items: center; gap: 8px; color: #82a7b7; font-size: 12px; }
.settings-save-status .el-icon { color: var(--green); }
.settings-save-status .el-icon.is-dirty { color: #ffc46d; }
@media (max-width: 900px) { .settings-main { padding: 18px 14px 28px; }.settings-layout { grid-template-columns: minmax(0, 1fr); gap: 10px; }.settings-nav { position: static; display: flex; gap: 5px; overflow-x: auto; padding: 6px; }.settings-nav-item { flex: 0 0 auto; min-height: 38px; }.settings-nav-arrow, .settings-nav-footer { display: none; }.settings-nav-item.active { box-shadow: inset 0 -2px var(--cyan); } }
@media (max-width: 600px) { .settings-main { padding: 14px 9px 22px; }.settings-heading h1 { font-size: 21px; }.settings-form-grid { grid-template-columns: minmax(0, 1fr); }.settings-form { padding: 0 13px 14px; }.settings-panel-intro { padding: 14px 13px 11px; }.settings-setting-row, .settings-duration-row { padding: 11px 13px; }.settings-master-row { margin-right: 13px; margin-left: 13px; }.settings-test-row { align-items: stretch; flex-direction: column; gap: 12px; margin: 12px 13px 14px; }.settings-test-controls { width: 100%; }.settings-test-select { flex: 1; width: auto; min-width: 0; }.settings-preference-card, .settings-data-card { grid-template-columns: 34px minmax(0, 1fr); gap: 10px; margin-right: 13px; margin-left: 13px; padding: 11px; }.settings-preference-icon, .settings-data-icon { width: 32px; height: 32px; }.settings-preference-card > .settings-preference-select, .settings-data-card > .el-tag { grid-column: 2; justify-self: start; }.settings-data-actions { margin-right: 13px; margin-left: 13px; }.settings-data-action { align-items: flex-start; flex-direction: column; justify-content: center; gap: 10px; padding: 13px 0; }.settings-inline-note { margin-right: 13px; margin-left: 13px; }.settings-save-bar { align-items: flex-start; flex-direction: column; }.settings-save-bar > div:last-child { width: 100%; }.settings-save-bar > div:last-child .el-button { flex: 1; margin: 0; }.settings-save-status { min-height: 20px; } }
</style>
