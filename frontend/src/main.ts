import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import App from './App.vue'
import router from './router'
import './styles/tailwind.css'
import './styles/theme/variables.scss'
import './styles/theme/index.scss'
import './styles/dashboard.scss'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus)
  .mount('#app')
