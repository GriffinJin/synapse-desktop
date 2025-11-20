<template>
  <div class="status-left">
    <span class="status-chip">
      <el-icon><Monitor /></el-icon>
      <span class="chip-text">{{ osText }}</span>
    </span>
    <span class="status-sep">•</span>
    <el-popover trigger="click" placement="top" width="260">
      <template #reference>
        <span :class="['status-chip', cpuStatusClass]">
          <el-icon><Cpu /></el-icon>
          <span class="chip-text">{{ cpuText }}</span>
        </span>
      </template>
      <div class="popover-content">
        <div class="popover-title">CPU Usage</div>
        <el-progress :percentage="cpuPercentDisplay" :status="cpuPercentDisplay > 80 ? 'warning' : 'success'" />
        <div class="popover-meta">Current: {{ cpuPercentDisplay }}%</div>
      </div>
    </el-popover>
    <span class="status-sep">•</span>
    <el-popover trigger="click" placement="top" width="280">
      <template #reference>
        <span :class="['status-chip', memStatusClass]">
          <el-icon><TrendCharts /></el-icon>
          <span class="chip-text">{{ memText }}</span>
          <span class="mini-meter">
            <span class="mini-meter-fill" :style="{ width: memMeterWidth, backgroundColor: memColor }" />
          </span>
        </span>
      </template>
      <div class="popover-content">
        <div class="popover-title">Memory Usage</div>
        <el-progress :percentage="memPercentDisplay" :status="memPercentDisplay > 80 ? 'warning' : 'success'" />
        <div class="popover-meta">Used: {{ memUsedGB }} GB</div>
        <div class="popover-meta">Total: {{ memTotalGB }} GB</div>
        <div class="popover-meta">Percent: {{ memPercentDisplay }}%</div>
      </div>
    </el-popover>
  </div>
  <div class="status-right">
    <el-button class="shortcut-btn" size="small" type="text">
      <el-icon><ArrowLeft /></el-icon>
      <span class="shortcut-text">Shortcuts</span>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Monitor, Cpu, TrendCharts, ArrowLeft } from '@element-plus/icons-vue';

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
  } catch {}
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

const cpuPercent = computed(() => stats.value?.cpu.percent ?? null);
const memPercent = computed(() => stats.value?.memory.percent ?? null);

const cpuPercentDisplay = computed(() => {
  const p = cpuPercent.value;
  return p == null ? 0 : Math.max(0, Math.min(100, Math.round(p)));
});
const memPercentDisplay = computed(() => {
  const p = memPercent.value;
  return p == null ? 0 : Math.max(0, Math.min(100, Math.round(p)));
});

const cpuStatusClass = computed(() => (cpuPercentDisplay.value > 80 ? 'metric-warn' : 'metric-ok'));
const memStatusClass = computed(() => (memPercentDisplay.value > 80 ? 'metric-warn' : 'metric-ok'));

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

const memMeterWidth = computed(() => `${memPercentDisplay.value}%`);
const memColor = computed(() => (memPercentDisplay.value > 80 ? '#f59e0b' : '#10b981'));
const memUsedGB = computed(() => {
  const s = stats.value;
  return s ? toGB(s.memory.usedBytes).toFixed(1) : '…';
});
const memTotalGB = computed(() => {
  const s = stats.value;
  return s ? toGB(s.memory.totalBytes).toFixed(1) : '…';
});
</script>

<style>
.statusbar { border-top: 1px solid var(--color-border); background: var(--color-statusbar-bg); font-size: 12px; color: var(--color-statusbar-text); display: flex; align-items: center; gap: 16px; padding: 0 8px; }
.status-left { display: flex; align-items: center; gap: 8px; }
.status-right { margin-left: auto; display: flex; align-items: center; }
.status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border: 1px solid var(--color-chip-border); border-radius: 12px; background: var(--color-chip-bg); color: var(--color-chip-text); }
.chip-text { line-height: 24px; }
.status-sep { color: var(--color-sep); }
.statusbar :deep(.el-icon) { color: var(--color-statusbar-text); }
.statusbar :deep(.el-button) { color: var(--color-statusbar-text); }
.mini-meter { width: 80px; height: 6px; border-radius: 3px; background: var(--color-mini-meter-bg); overflow: hidden; display: inline-block; }
.mini-meter-fill { display: block; height: 100%; width: 0%; transition: width 0.25s ease; }
.metric-warn .chip-text { color: var(--color-metric-warn); }
.metric-ok .chip-text { color: var(--color-metric-ok); }
.popover-content { display: grid; gap: 6px; }
.popover-title { font-weight: 600; font-size: 13px; }
.popover-meta { font-size: 12px; color: var(--color-statusbar-text); }
.shortcut-text { font-size: 12px; }
.shortcut-btn .shortcut-text { max-width: 0; opacity: 0; margin-left: 0; transition: max-width 0.2s ease, opacity 0.2s ease, margin 0.2s ease; overflow: hidden; white-space: nowrap; }
.shortcut-btn:hover .shortcut-text { max-width: 120px; opacity: 1; margin-left: 6px; }
</style>