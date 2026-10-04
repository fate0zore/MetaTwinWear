<template>
  <DashboardPanel title="智能体问答" :icon="ChatDotRound" class="agent-chat-panel">
    <div class="chat-body" aria-live="polite">
      <div v-if="messages.length === 0" class="chat-empty">
        <el-icon><Service /></el-icon>
        <span>基于当前业务上下文为你解答</span>
      </div>
      <article v-for="message in messages" :key="message.id" class="chat-message" :class="`message-${message.role}`">
        <div class="message-avatar"><el-icon><component :is="message.role === 'assistant' ? Service : UserFilled" /></el-icon></div>
        <div class="message-content">
          <p>{{ message.content }}</p>
          <time>{{ message.time }}</time>
        </div>
      </article>
      <div v-if="pending" class="chat-pending"><span></span><span></span><span></span> 正在结合当前数据分析…</div>
    </div>
    <form class="chat-compose" @submit.prevent="submit">
      <el-input v-model="draft" type="textarea" :rows="2" maxlength="240" resize="none" placeholder="输入与当前数据有关的问题…" />
      <el-button type="primary" native-type="submit" :disabled="!draft.trim() || pending" :loading="pending" aria-label="发送问题"><el-icon><Promotion /></el-icon></el-button>
    </form>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChatDotRound, Promotion, Service, UserFilled } from '@element-plus/icons-vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import type { AgentMessage } from '@/shared/types/agent'

defineProps<{ messages: AgentMessage[]; pending: boolean }>()
const emit = defineEmits<{ send: [question: string] }>()
const draft = ref('')

function submit() {
  const question = draft.value.trim()
  if (!question) return
  emit('send', question)
  draft.value = ''
}
</script>

<style scoped lang="scss">
.agent-chat-panel { min-width: 0; }
.chat-body { display: flex; flex-direction: column; gap: 10px; min-height: 180px; max-height: 380px; overflow: auto; padding: 12px; }
.chat-empty { display: grid; place-items: center; align-content: center; gap: 8px; min-height: 150px; color: #79aabe; font-size: 13px; text-align: center; }
.chat-empty .el-icon { color: var(--cyan); font-size: 30px; }
.chat-message { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.message-user { flex-direction: row-reverse; }
.message-avatar { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; border: 1px solid rgba(24, 200, 255, .5); border-radius: 50%; color: var(--cyan); background: rgba(5, 54, 78, .65); }
.message-user .message-avatar { color: #b7d9e7; border-color: rgba(112, 160, 184, .5); }
.message-content { min-width: 0; max-width: 88%; padding: 8px 10px; border: 1px solid rgba(36, 129, 171, .36); background: rgba(5, 34, 55, .72); }
.message-content p { margin: 0; color: #c4e8f3; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.message-content time { display: block; margin-top: 5px; color: #6f9bb1; font-size: 12px; }
.message-user .message-content { background: rgba(5, 67, 93, .62); }
.chat-pending { display: flex; align-items: center; gap: 5px; color: #83b1c2; font-size: 12px; }
.chat-pending span { width: 5px; height: 5px; border-radius: 50%; background: var(--cyan); animation: chat-pulse .85s infinite alternate; }
.chat-pending span:nth-child(2) { animation-delay: .2s; }.chat-pending span:nth-child(3) { animation-delay: .4s; }
.chat-compose { display: flex; align-items: stretch; gap: 8px; padding: 10px; border-top: 1px solid rgba(36, 129, 171, .28); }
.chat-compose :deep(.el-textarea__inner) { min-height: 54px; }

.chat-compose .el-button { width: 44px; min-height: 54px; margin: 0; }.chat-compose .el-icon { font-size: 18px; }
@keyframes chat-pulse { to { opacity: .3; transform: translateY(-2px); } }
@media (max-width: 480px) { .chat-body { min-height: 120px; max-height: 300px; padding: 9px; } .chat-compose { padding: 8px; } }
</style>
