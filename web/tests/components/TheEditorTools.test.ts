// SPDX-License-Identifier: AGPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import TheEditor from '@/views/home/modules/TheEditor.vue'
import TheEditorButtons from '@/views/home/modules/TheEditor/TheEditorButtons.vue'
import { useEditorStore } from '@/stores/editor'
import { useEchoStore } from '@/stores/echo'
import { ExtensionType, Mode } from '@/enums/enums'
import { FILE_CATEGORY } from '@/constants/file'

vi.mock('@/service/api', () => ({
  fetchAddEcho: vi.fn(),
  fetchUpdateEcho: vi.fn(),
  fetchGetTags: vi.fn().mockResolvedValue({ code: 1, data: [] }),
  fetchGetEchoById: vi.fn(),
  fetchQueryEchos: vi.fn(),
}))

vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))

let wrapper: VueWrapper
const mountEditor = async () => {
  wrapper = mount(TheEditor, {
    global: {
      directives: { tooltip: {} },
      stubs: {
        TheMdEditor: { template: '<textarea data-test="text-editor" />' },
        TheEditorButtons: true,
        TheEditorPreview: true,
        TheMediaEditor: { template: '<div data-test="media-editor" />' },
        TheExtensionEditor: { template: '<div data-test="extension-editor" />' },
      },
    },
  })
  await flushPromises()
}

describe('Always-visible editor tools', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => wrapper?.unmount())

  it('shows all nine labeled tools before opening a panel', async () => {
    await mountEditor()
    expect(wrapper.findAll('.editor-mode-panel button')).toHaveLength(9)
    expect(wrapper.text()).toContain('editor.extMusic')
    expect(wrapper.text()).toContain('editor.mediaTypeAudio')
    expect(wrapper.find('[data-test="text-editor"]').exists()).toBe(true)
  })

  it('opens music directly, preserves the text editor and toggles the panel closed', async () => {
    await mountEditor()
    const music = wrapper.find('button[aria-label="editor.addMusic"]')
    await music.trigger('click')
    await flushPromises()

    expect(useEditorStore().currentMode).toBe(Mode.EXTEN)
    expect(useEditorStore().extensionToAdd.extension_type).toBe(ExtensionType.MUSIC)
    expect(wrapper.find('[data-test="text-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="extension-editor"]').exists()).toBe(true)

    await music.trigger('click')
    expect(useEditorStore().currentMode).toBe(Mode.ECH0)
    expect(wrapper.find('[data-test="extension-editor"]').exists()).toBe(false)
  })

  it('opens audio attachments directly while the text editor stays visible', async () => {
    await mountEditor()
    await wrapper.find('button[aria-label="editor.mediaTypeAudio"]').trigger('click')
    await flushPromises()

    expect(useEditorStore().currentMode).toBe(Mode.Media)
    expect(useEditorStore().effectiveCategory).toBe(FILE_CATEGORY.AUDIO)
    expect(wrapper.find('[data-test="text-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-editor"]').exists()).toBe(true)
  })

  it('retains the way back from tag management', async () => {
    useEditorStore().setMode(Mode.TagManage)
    useEchoStore().tagList = [{ id: 'tag-1', name: 'Tag', usage_count: 1, created_at: 1 }]
    wrapper = mount(TheEditorButtons, { global: { directives: { tooltip: {} } } })
    await wrapper.find('button[aria-label="editor.backToEditor"]').trigger('click')

    expect(useEditorStore().currentMode).toBe(Mode.ECH0)
  })
})
