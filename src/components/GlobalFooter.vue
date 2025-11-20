<template>
  <el-row align="center" justify="space-between">
    <el-col :span="10" style="height: 24px;">
      <el-text style="margin-right: 20px;">{{ osText }}</el-text>
      <el-text style="margin-right: 20px;">{{ cpuText }}</el-text>
      <el-text style="margin-right: 20px;">{{ memText }}</el-text>
    </el-col>
    <el-col :span="1" style="text-align: right; height: 24px;">
      <el-button :icon="ArrowLeft" size="small" type="text" style="height: 24px;"/>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ArrowLeft } from '@element-plus/icons-vue';

type SystemStats = {
  os: { platform: string; release: string; arch: string };
  cpu: { percent: number | null };
  memory: { usedBytes: number; totalBytes: number; percent: number };
};

const stats = ref<SystemStats | null>(null);

function platformName(p: string) {
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  if (p === 'linux') return 'Linux';
  return p;
}

async function refreshStats() {
  try {
    const s = await (window as any).system?.getStats?.();
    if (s) stats.value = s;
  } catch { }
}

let statsTimer: number | null = null;
onMounted(async () => {
  await refreshStats();
  statsTimer = window.setInterval(refreshStats, 1000);
});
onUnmounted(() => {
  if (statsTimer) {
    window.clearInterval(statsTimer);
    statsTimer = null;
  }
});

const osText = computed(() => {
  const s = stats.value;
  if (!s) return 'OS: …';
  return `OS: ${platformName(s.os.platform)} ${s.os.release} ${s.os.arch}`;
});

const cpuText = computed(() => {
  const p = stats.value?.cpu.percent;
  return p == null ? 'CPU: …' : `CPU: ${p.toFixed(0)}%`;
});

function toGB(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
}

const memText = computed(() => {
  const s = stats.value;
  if (!s) return 'Mem: …';
  const used = toGB(s.memory.usedBytes);
  const total = toGB(s.memory.totalBytes);
  return `Mem: ${used.toFixed(1)} / ${total.toFixed(1)} GB (${s.memory.percent.toFixed(0)}%)`;
});

</script>