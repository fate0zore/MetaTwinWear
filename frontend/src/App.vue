<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleSessionExpired() {
  const current = router.currentRoute.value
  if (current.name === 'Login') return
  void router.replace({ name: 'Login', query: { redirect: current.fullPath } })
}

onMounted(() => window.addEventListener('metatwinwear:auth-expired', handleSessionExpired))
onBeforeUnmount(() => window.removeEventListener('metatwinwear:auth-expired', handleSessionExpired))
</script>
