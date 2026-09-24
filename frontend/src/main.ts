import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './styles/tailwind.css'
import './styles/variables.css'
import './styles/dashboard.scss'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus)
  .mount('#app')
