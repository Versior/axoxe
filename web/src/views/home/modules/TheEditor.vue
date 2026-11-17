<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div v-if="ShowEditor" class="editor-shell">
    <div class="editor-shell__inner">
      <div class="editor-shell__body">
        <TheMdEditor v-if="currentMode !== Mode.TagManage" class="rounded-[var(--radius-xs)]" />
        <TheModePanel v-if="currentMode !== Mode.TagManage" />
        <TheMediaEditor v-if="currentMode === Mode.Media" class="editor-shell__panel" />
        <TheExtensionEditor v-if="currentMode === Mode.EXTEN" class="editor-shell__panel" />
        <TheTagsManager v-if="currentMode === Mode.TagManage" />
      </div>

      <TheEditorButtons />
      <TheEditorPreview />
    </div>
  </div>
</template>

<script setup lang="ts">
import TheEditorPreview from './TheEditor/TheEditorPreview.vue'
import TheEditorButtons from './TheEditor/TheEditorButtons.vue'
import TheModePanel from './TheEditor/TheModePanel.vue'

import { theToast } from '@/utils/toast'
import { defineAsyncComponent, watch } from 'vue'
import { useEditorStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { Mode } from '@/enums/enums'
import { useI18n } from 'vue-i18n'

const TheMdEditor = defineAsyncComponent(() => import('@/components/advanced/md/TheMdEditor.vue'))
const TheMediaEditor = defineAsyncComponent(() => import('./TheEditor/TheMediaEditor.vue'))
const TheExtensionEditor = defineAsyncComponent(() => import('./TheEditor/TheExtensionEditor.vue'))
const TheTagsManager = defineAsyncComponent(() => import('./TheEditor/TheTagsManager.vue'))

const editorStore = useEditorStore()
const { ShowEditor, currentMode, videoURL, extensionToAdd } = storeToRefs(editorStore)
const { t } = useI18n()

watch(
  () => videoURL.value,
  (newVal) => {
    if (newVal.length > 0) {
      const bvRegex = /(BV[0-9A-Za-z]{10})/
      const ytRegex =
        /(?:https?:\/\/(?:www\.)?)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|shorts|live)\/))([\w-]+)/
      let match = newVal.match(bvRegex)
      if (match) {
        extensionToAdd.value.extension = match[0]
      } else {
        match = newVal.match(ytRegex)
        if (match) {
          extensionToAdd.value.extension = match[1] ?? ''
        } else {
          theToast.error(String(t('editor.videoShareLinkInvalid')))
        }
      }
    }
  },
)
</script>

<style scoped>
.editor-shell {
  position: relative;
  z-index: 24;
  isolation: isolate;
  margin: 0 auto;
  border-radius: 1rem;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-sm);
}

.editor-shell__inner {
  width: 100%;
  padding: 0.85rem;
}

.editor-shell__body {
  margin-bottom: 0.5rem;
}

.editor-shell__body :deep(.markdown-editor:not(.is-full)) {
  border-radius: 0.75rem;
  border-color: transparent;
  background: var(--color-bg-muted);
  box-shadow: none;
}

.editor-shell__body :deep(.markdown-editor:not(.is-full):focus-within) {
  border-color: var(--color-border-strong);
}

.editor-shell__panel {
  padding: 0.85rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: 0.75rem;
  background: var(--color-bg-muted);
}

@media (width >= 640px) {
  .editor-shell__inner {
    padding: 1rem;
  }
}
</style>
