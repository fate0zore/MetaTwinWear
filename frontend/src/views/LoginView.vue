<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="login-brand">
        <img :src="swjtuCrest" alt="西南交通大学校徽" />
        <div>
          <p>METATWINWEAR</p>
          <h1>刀具磨损智能监测与预测系统</h1>
        </div>
      </div>

      <div class="login-heading">
        <span class="login-eyebrow">SECURE WORKSPACE</span>
        <h2 id="login-title">欢迎登录</h2>
        <p>登录后继续使用设备监测与管理工作台。</p>
      </div>

      <el-alert
        v-if="auth.persistenceWarning"
        :title="auth.persistenceWarning"
        type="warning"
        show-icon
        :closable="false"
        class="login-alert"
      />

      <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @submit.prevent="submit">
        <el-form-item label="账号" prop="account">
          <el-input
            v-model="form.account"
            autocomplete="username"
            autofocus
            maxlength="80"
            placeholder="请输入账号"
            size="large"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            autocomplete="current-password"
            placeholder="请输入密码"
            show-password
            size="large"
            type="password"
          />
        </el-form-item>
        <div class="login-options">
          <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
          <span>保持登录 7 天</span>
        </div>
        <el-button class="login-submit" type="primary" size="large" native-type="submit" :loading="submitting">
          登 录
        </el-button>
      </el-form>

      <p class="login-footer">演示登录：输入任意账号和非空密码即可进入</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import swjtuCrest from '@/assets/dashboard/swjtu-crest.png'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useSystemSettingsStore } from '@/features/system-settings/stores/systemSettings'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSystemSettingsStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({ account: '', password: '', rememberMe: false })
const rules: FormRules = {
  account: [{ required: true, whitespace: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, whitespace: true, message: '请输入密码', trigger: 'blur' }],
}

function getReturnPath(): string {
  const requested = route.query.redirect
  if (typeof requested !== 'string' || !requested.startsWith('/') || requested.startsWith('//')) {
    return settings.settings.preferences.defaultRoute
  }
  const resolved = router.resolve(requested)
  return resolved.matched.length && resolved.name !== 'Login' && resolved.path !== '/'
    ? resolved.fullPath
    : settings.settings.preferences.defaultRoute
}

async function submit() {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await auth.login(form)
    if (auth.persistenceWarning) ElMessage.warning(auth.persistenceWarning)
    await router.replace(getReturnPath())
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请重试。')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  place-items: center;
  padding: 28px 20px;
  color: var(--text);
  background:
    radial-gradient(ellipse at 16% 12%, rgba(0, 145, 190, .18), transparent 36%),
    radial-gradient(ellipse at 86% 82%, rgba(28, 95, 171, .16), transparent 38%),
    linear-gradient(135deg, #071822, #03101a 58%, #020910);
}

.login-card {
  width: min(100%, 440px);
  padding: clamp(24px, 6vw, 42px);
  border: 1px solid rgba(74, 158, 190, .3);
  border-radius: 14px;
  background: linear-gradient(150deg, rgba(11, 37, 54, .96), rgba(5, 20, 32, .97));
  box-shadow: 0 28px 80px rgba(0, 0, 0, .38), 0 0 42px rgba(0, 140, 185, .07);
}

.login-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
.login-brand img { width: 48px; height: 48px; object-fit: contain; flex: 0 0 auto; }
.login-brand p, .login-eyebrow { margin: 0; color: #48c5df; font-size: 12px; font-weight: 700; letter-spacing: .14em; }
.login-brand h1 { margin: 5px 0 0; color: #ccebf4; font-size: 15px; font-weight: 600; line-height: 1.5; }
.login-heading { margin: 42px 0 24px; }
.login-heading h2 { margin: 10px 0 7px; font-size: 25px; font-weight: 650; }
.login-heading p { margin: 0; color: #86aab9; font-size: 14px; line-height: 1.7; }
.login-alert { margin: -6px 0 18px; }
.login-form :deep(.el-form-item__label) { color: #b6d0db; }
.login-form :deep(.el-input__wrapper) { min-height: 44px; border: 1px solid rgba(75, 137, 160, .35); background: rgba(3, 17, 28, .72); box-shadow: none; }
.login-form :deep(.el-input__wrapper.is-focus) { border-color: var(--cyan); box-shadow: 0 0 0 1px var(--cyan); }
.login-form :deep(.el-input__inner) { color: #e1f3f8; }
.login-form :deep(.el-input__inner::placeholder) { color: #668693; }
.login-form :deep(.el-form-item) { margin-bottom: 21px; }
.login-options { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -1px 0 24px; }
.login-options > span { color: #7796a4; font-size: 12px; }
.login-submit { width: 100%; min-height: 46px; border: 0; background: linear-gradient(100deg, #087dab, #12a2bb); font-weight: 650; letter-spacing: .16em; }
.login-submit:hover { background: linear-gradient(100deg, #0991c4, #19b3cb); }
.login-footer { margin: 20px 0 0; color: #668693; font-size: 12px; line-height: 1.6; text-align: center; }

@media (max-width: 480px) {
  .login-page { padding: 18px 14px; }
  .login-card { padding: 26px 22px; }
  .login-brand { gap: 10px; }
  .login-brand img { width: 42px; height: 42px; }
  .login-brand h1 { font-size: 13px; }
  .login-heading { margin-top: 34px; }
}
</style>
