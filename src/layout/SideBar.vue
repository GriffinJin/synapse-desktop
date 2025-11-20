<template>
  <el-aside
    :width="isAsideCollapsed ? '64px' : '220px'"
    :class="['aside', { collapsed: isAsideCollapsed }]"
  >
    <el-menu :default-active="activeMenu" @select="onSelectMenu">
      <el-menu-item index="workspace">
        <el-icon>
          <Folder />
        </el-icon>
        <span>Workspace</span>
      </el-menu-item>
      <el-menu-item index="maven">
        <el-icon>
          <Collection />
        </el-icon>
        <span>Maven</span>
      </el-menu-item>
      <el-menu-item index="env">
        <el-icon>
          <Setting />
        </el-icon>
        <span>Environments</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Collection, Folder, Setting } from "@element-plus/icons-vue";
const isAsideCollapsed = ref(false);
</script>
