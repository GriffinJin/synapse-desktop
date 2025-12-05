<template>
  <div class="app-container">
    <header class="app-header">
      <GlobalHeader />
    </header>
    <div class="app-body">
      <aside class="app-sidebar">
        <GlobalAside />
      </aside>
      <main class="app-main">
        <router-view />
      </main>
    </div>
    <footer class="app-footer">
      <GlobalFooter />
    </footer>
  </div>
</template>

<script setup lang="ts">
import GlobalHeader from './components/GlobalHeader.vue';
import GlobalAside from './components/GlobalAside.vue';
import GlobalFooter from './components/GlobalFooter.vue';
</script>

<style>
/* App-specific overrides can go here */
</style>