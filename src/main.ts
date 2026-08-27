import { createPinia } from 'pinia'
import { createApp } from 'vue'

import '@mmt817/pixel-ui/dist/index.css'
import App from './App.vue'
import { i18n } from './i18n'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)

app.mount('#app')
