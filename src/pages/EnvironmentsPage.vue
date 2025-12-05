<template>
  <div>
    <PageHeader title="Environments" subtitle="Show versions of Java, Python, and Maven" />
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
      <div class="card">
        <div class="card-header">Java</div>
        <div class="card-body env-value">{{ envJavaText }}</div>
      </div>
      <div class="card">
        <div class="card-header">Python</div>
        <div class="card-body env-value">{{ envPythonText }}</div>
      </div>
      <div class="card">
        <div class="card-header">Maven</div>
        <div class="card-body env-value">{{ envMavenText }}</div>
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-actions">
        <vscode-button appearance="primary" @click="refreshEnv">Refresh</vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import PageHeader from '../components/PageHeader.vue';

type EnvVersions = { java: string | null; python: string | null; mvn: string | null };
const envVersions = ref<EnvVersions | null>(null);

async function refreshEnv() {
  try {
    const v = await (window as any).system.getEnvVersions();
    envVersions.value = v;
  } catch {}
}

const envJavaText = computed(() => {
  const v = envVersions.value?.java;
  return v ? `Java ${v}` : 'Java: Not found';
});
const envPythonText = computed(() => {
  const v = envVersions.value?.python;
  return v ? `Python ${v}` : 'Python: Not found';
});
const envMavenText = computed(() => {
  const v = envVersions.value?.mvn;
  return v ? `Maven ${v}` : 'Maven: Not found';
});

onMounted(async () => {
  await refreshEnv();
});
</script>

<style scoped>
.env-value {
  font-size: 14px;
  color: var(--vscode-text);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>