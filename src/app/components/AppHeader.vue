<template>
  <!-- App header extracted as a reusable component (English-only comments) -->
  <el-header height="52px" class="titlebar">
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
  </el-header>
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