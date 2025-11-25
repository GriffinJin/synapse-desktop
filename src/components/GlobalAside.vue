<template>
  <el-menu style="height: calc(100vh - 60px - 25px);" :default-active="activeMenu" @select="onSelectMenu">
    <el-menu-item index="workspace">
      <el-icon><Folder /></el-icon>
      <span>Workspace</span>
    </el-menu-item>
    <el-menu-item index="maven">
      <el-icon><Collection /></el-icon>
      <span>Maven</span>
    </el-menu-item>
    <el-menu-item index="env">
      <el-icon><Setting /></el-icon>
      <span>Environments</span>
    </el-menu-item>
    <el-menu-item index="database">
      <el-icon><Coin /></el-icon>
      <span>Database</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Collection, Folder, Setting, Coin } from "@element-plus/icons-vue";
const route = useRoute();
const router = useRouter();
const activeMenu = computed(() => String(route.name || 'workspace'));
function onSelectMenu(index: string) {
  router.push({ name: index });
}
</script>
