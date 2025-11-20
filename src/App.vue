<template>
  <div class="common-layout">
    <el-container>
      <el-header><AppHeader /></el-header>
      <el-container>
        <el-aside><SideBar /></el-aside>
        <el-main><router-view /></el-main>
      </el-container>
      <el-footer height="28px" class="statusbar"><StatusBar /></el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './components/GlobalHeader.vue';
import SideBar from './components/SideBar.vue';
import StatusBar from './components/StatusBar.vue';

const isAsideCollapsed = ref(false);
</script>

<style>
.common-layout { position: fixed; inset: 0; }
.common-layout :deep(.el-container) { height: 100%; }
.common-layout :deep(.el-header) { padding: 0; }
.common-layout :deep(.el-main) { height: 100%; overflow: auto; }
.common-layout :deep(.el-aside) { border-right: 1px solid #e6e6e6; }
</style>