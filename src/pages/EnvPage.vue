<template>
  <div>
    <div class="section-header">
      <h2>Environments</h2>
      <span class="muted">Show versions of Java, Python, and Maven</span>
    </div>
    <div class="env-grid">
      <div class="env-item">
        <div class="env-label">Java</div>
        <div class="env-value">{{ envJavaText }}</div>
      </div>
      <div class="env-item">
        <div class="env-label">Python</div>
        <div class="env-value">{{ envPythonText }}</div>
      </div>
      <div class="env-item">
        <div class="env-label">Maven</div>
        <div class="env-value">{{ envMavenText }}</div>
      </div>
    </div>
    <div class="toolbar" style="margin-top: 12px;">
      <div></div>
      <div class="toolbar-actions">
        <el-button @click="refreshEnv" type="primary">Refresh</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

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