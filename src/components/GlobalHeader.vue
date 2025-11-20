<template>
  <el-row align="middle" style="height: 60px;" justify="space-between">
    <el-col :span="6">Synapse Desktop</el-col>
    <el-col :span="6" style="text-align: right;">
        <el-button circle :icon="Search" @click="handleOpenSearch" :title="'Search'" />
        <el-button circle :icon="Bell" @click="handleOpenNotifications" :title="'Notifications'" />
        <el-button circle :icon="Setting" @click="handleOpenSettings" :title="'Open settings'" />
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { Search, Setting, Bell } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';

function handleOpenSearch() {
ElMessageBox.alert('搜索', '提示', {
  confirmButtonText: '确定'
});
}

function handleOpenNotifications() {
  console.log('handleOpenNotifications');
  ElMessageBox.alert('信息', '提示', {
  confirmButtonText: '确定'
});
}

function handleOpenSettings() {
  console.log('handleOpenSettings');
  ElMessageBox.alert('设置', '提示', {
  confirmButtonText: '确定'
});
}
</script>