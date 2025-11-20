<template>
  <div>
    <PageHeader title="Environments" subtitle="Show versions of Java, Python, and Maven" />
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>Java</span>
              </div>
            </template>
            <div class="env-value">{{ envJavaText }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>Python</span>
              </div>
            </template>
            <div class="env-value">{{ envPythonText }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>Maven</span>
              </div>
            </template>
            <div class="env-value">{{ envMavenText }}</div>
          </el-card>
        </el-col>
      </el-row>
      <div class="toolbar">
        <div class="toolbar-actions">
          <el-button @click="refreshEnv" type="primary">Refresh</el-button>
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

<style>

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.env-value {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>