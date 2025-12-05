<template>
    <div class="section-header">
        <div class="header-left">
            <h2>{{ title }}</h2>
            <span v-if="subtitle" class="muted">{{ subtitle }}</span>
        </div>
        <div v-if="$slots.default" class="header-right">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string; subtitle?: string }>();
const { title, subtitle } = props;
</script>
<style scoped>
.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
}

.header-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.muted {
  color: var(--el-color-primary);
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>