import { ref } from 'vue';

// English-only comments: Global UI state for overlays and toggles

// Settings overlay
export const settingsOpen = ref(false);
export function openSettings() { settingsOpen.value = true; }
export function closeSettings() { settingsOpen.value = false; }

// Quick search dialog
export const searchOpen = ref(false);
let searchFocusHook: (() => void) | null = null;
export function registerSearchFocus(fn: (() => void) | null) { searchFocusHook = fn; }
export function openSearch() {
  // Prevent opening search when settings overlay is visible
  if (settingsOpen.value) return;
  searchOpen.value = true;
  // Invoke focus hook if provided
  if (searchFocusHook) searchFocusHook();
}
export function closeSearch() { searchOpen.value = false; }

// Notifications drawer
export const notificationsOpen = ref(false);
export function openNotifications() { notificationsOpen.value = true; }
export function closeNotifications() { notificationsOpen.value = false; }

// Shortcuts drawer
export const shortcutsOpen = ref(false);
export function openShortcuts() { shortcutsOpen.value = true; }
export function closeShortcuts() { shortcutsOpen.value = false; }