<template>
    <div class="section-header">
        <h2>{{ title }}</h2>
        <span v-if="subtitle" class="muted">{{ subtitle }}</span>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string; subtitle?: string }>();
const { title, subtitle } = props;
</script>
<style scoped>
.section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 20px;
}

.muted {
  color: var(--el-color-primary);
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>