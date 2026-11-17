<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="editor-mode-panel" role="group" :aria-label="t('editor.extraContent')">
    <button
      v-for="option in mediaOptions"
      :key="option.value"
      type="button"
      class="editor-mode-panel__option"
      v-tooltip="option.tooltip"
      :aria-label="option.tooltip"
      :aria-pressed="
        editorStore.currentMode === Mode.Media && editorStore.effectiveCategory === option.value
      "
      @click="handleAddMedia(option.value)"
    >
      <component :is="option.icon" aria-hidden="true" />
      <span>{{ option.label }}</span>
    </button>
    <button
      v-for="option in extensionOptions"
      :key="option.value"
      type="button"
      class="editor-mode-panel__option"
      v-tooltip="option.tooltip"
      :aria-label="option.tooltip"
      :aria-pressed="
        editorStore.currentMode === Mode.EXTEN &&
        editorStore.extensionToAdd.extension_type === option.value
      "
      @click="handleAddExtension(option.value)"
    >
      <component :is="option.icon" aria-hidden="true" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import Weblink from '@/components/icons/weblink.vue'
import Music from '@/components/icons/music.vue'
import Video from '@/components/icons/video.vue'
import Githubproj from '@/components/icons/githubproj.vue'
import MapPin from '@/components/icons/mappin.vue'
import XBrand from '@/components/icons/tweet.vue'
import Image from '@/components/icons/image.vue'
import Audio from '@/components/icons/audio.vue'
import VideoMedia from '@/components/icons/videomedia.vue'

import { Mode, ExtensionType } from '@/enums/enums'
import { FILE_CATEGORY, FILE_STORAGE_TYPE, type FileCategory } from '@/constants/file'
import { localStg } from '@/utils/storage'
import { useEditorStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const editorStore = useEditorStore()
const { t } = useI18n()

const mediaOptions = computed(() => [
  {
    label: t('editor.mediaTypeImage'),
    tooltip: t('editor.addImage'),
    icon: Image,
    value: FILE_CATEGORY.IMAGE,
  },
  {
    label: t('editor.mediaTypeAudio'),
    tooltip: t('editor.mediaTypeAudio'),
    icon: Audio,
    value: FILE_CATEGORY.AUDIO,
  },
  {
    label: t('editor.mediaTypeVideo'),
    tooltip: t('editor.mediaTypeVideo'),
    icon: VideoMedia,
    value: FILE_CATEGORY.VIDEO,
  },
])
const extensionOptions = computed(() => [
  {
    label: t('editor.extMusic'),
    tooltip: t('editor.addMusic'),
    icon: Music,
    value: ExtensionType.MUSIC,
  },
  {
    label: t('editor.extVideoLink'),
    tooltip: t('editor.addVideo'),
    icon: Video,
    value: ExtensionType.VIDEO,
  },
  {
    label: t('editor.extGithubProject'),
    tooltip: t('editor.addGithubProject'),
    icon: Githubproj,
    value: ExtensionType.GITHUBPROJ,
  },
  {
    label: t('editor.extWebsiteLink'),
    tooltip: t('editor.addWebsiteLink'),
    icon: Weblink,
    value: ExtensionType.WEBSITE,
  },
  {
    label: t('editor.extLocation'),
    tooltip: t('editor.addLocation'),
    icon: MapPin,
    value: ExtensionType.LOCATION,
  },
  {
    label: t('editor.extTweet'),
    tooltip: t('editor.addTweet'),
    icon: XBrand,
    value: ExtensionType.TWEET,
  },
])

const handleAddMedia = (category: FileCategory) => {
  if (editorStore.currentMode === Mode.Media && editorStore.effectiveCategory === category) {
    editorStore.setMode(Mode.ECH0)
    return
  }
  editorStore.fileToAdd.storage_type =
    localStg.getItem<App.Api.File.StorageType>('file_storage_type') ?? FILE_STORAGE_TYPE.LOCAL
  editorStore.setSelectedCategory(category)
  editorStore.setMode(Mode.Media)
}

const handleAddExtension = (extensiontype: ExtensionType) => {
  if (
    editorStore.currentMode === Mode.EXTEN &&
    editorStore.extensionToAdd.extension_type === extensiontype
  ) {
    editorStore.setMode(Mode.ECH0)
    return
  }
  editorStore.currentMode = Mode.EXTEN
  editorStore.extensionToAdd.extension_type = extensiontype
}
</script>

<style scoped>
.editor-mode-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  padding: 0.55rem 0;
  border-top: 1px solid var(--color-border-subtle);
}

.editor-mode-panel__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 1.9rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid transparent;
  border-radius: 0.3rem;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.editor-mode-panel__option > svg {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.editor-mode-panel__option:hover {
  background: var(--color-bg-muted);
  color: var(--color-text-primary);
}

.editor-mode-panel__option:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.editor-mode-panel__option[aria-pressed='true'] {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}
</style>
