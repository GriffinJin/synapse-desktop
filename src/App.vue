<template>
  <div class="common-layout">
    <el-container>
      <el-header><GlobalHeader /></el-header>
      <el-container>
        <el-aside><GlobalAside /></el-aside>
        <el-main style="padding-top: 0px;"><router-view /></el-main>
      </el-container>
      <el-footer style="height: 20px;padding-right: 0px;"><GlobalFooter /></el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import GlobalHeader from './components/GlobalHeader.vue';
import GlobalAside from './components/GlobalAside.vue';
import GlobalFooter from './components/GlobalFooter.vue';
</script>

<style>
</style>