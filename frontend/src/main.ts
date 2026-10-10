import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { useSystemSettingsStore } from '@/features/system-settings/stores/systemSettings'

import App from './App.vue'
import router from './router'
import './styles/tailwind.css'
import './styles/theme/variables.scss'
import './styles/theme/index.scss'
import './styles/dashboard.scss'

const pinia = createPinia()

async function mountApp() {
  await useSystemSettingsStore(pinia).initialize()

  createApp(App)
    .use(pinia)
    .use(router)
    .use(ElementPlus)
    .mount('#app')
}

void mountApp()
