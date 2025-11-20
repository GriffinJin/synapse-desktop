<template>
  <div class="common-layout">
    <el-container>
      <el-header height="52px" class="titlebar"><AppHeader /></el-header>
      <el-container>
        <el-aside :width="isAsideCollapsed ? '64px' : '220px'" :class="['aside', { collapsed: isAsideCollapsed }]">
          <SideBar />
        </el-aside>
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './app/components/AppHeader.vue';
import SideBar from './layout/SideBar.vue';

const isAsideCollapsed = ref(false);
</script>

<style>
.common-layout { position: fixed; inset: 0; }
.common-layout :deep(.el-container) { height: 100%; }
.common-layout :deep(.el-header) { padding: 0; }
.common-layout :deep(.el-main) { height: 100%; overflow: auto; }
.common-layout :deep(.el-aside) { border-right: 1px solid #e6e6e6; }
</style>