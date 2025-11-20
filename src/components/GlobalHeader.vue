<template>
  <div class="titlebar-inner">
    <div class="brand no-drag">Synapse Desktop</div>
    <div class="titlebar-search no-drag" @click="handleOpenSearch">
      <el-input readonly placeholder="Quick Search" class="search-input">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
        <template #suffix>
          <span class="kbd-hint">Cmd + P</span>
        </template>
      </el-input>
    </div>
    <div class="titlebar-actions no-drag">
      <el-button class="icon-btn" type="text" @click="handleOpenNotifications" :title="'Notifications'">
        <el-icon><Bell /></el-icon>
      </el-button>
      <el-button class="icon-btn settings-btn" type="text" @click="handleOpenSettings" :title="'Open settings'">
        <el-icon><Setting /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Setting, Bell } from '@element-plus/icons-vue';

const emit = defineEmits<{
  (e: 'open-search'): void;
  (e: 'open-notifications'): void;
  (e: 'open-settings'): void;
}>();

// Local methods used by header interactions, forwarding via emits
function handleOpenSearch() { emit('open-search'); }
function handleOpenNotifications() { emit('open-notifications'); }
function handleOpenSettings() { emit('open-settings'); }

// Icons used inside the header component
</script>

<style>
.titlebar {
  -webkit-app-region: drag;
  border-bottom: none;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-sizing: border-box;
  background: linear-gradient(90deg, var(--color-header-gradient-start) 0%, var(--color-header-gradient-end) 100%);
  color: var(--color-header-text);
}

.titlebar-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 100%;
  padding-left: 72px;
  padding-right: 12px;
}

.titlebar-search {
  width: 80%;
  max-width: 1000px;
  min-width: 520px;
}

.titlebar-actions {
  justify-self: end;
}

.titlebar-actions :deep(.el-button) {
  color: var(--color-header-text);
}

.titlebar :deep(.el-icon) {
  color: var(--color-header-icon);
}

.search-input :deep(.el-input__wrapper) {
  height: 34px;
  border-radius: 17px;
  background: var(--color-header-search-bg);
  border-color: transparent;
  box-shadow: none;
}

.search-input :deep(.el-input__inner) {
  color: var(--color-header-text);
}

.search-input :deep(.el-input__inner::placeholder) {
  color: var(--color-header-text);
}

.kbd-hint {
  display: inline-block;
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-bottom-width: 2px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  line-height: 18px;
}

.no-drag {
  -webkit-app-region: no-drag;
}

.brand {
  font-weight: 600;
  color: var(--color-header-text);
}
</style>