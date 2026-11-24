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
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import zhCN from '@/locales/messages/zh-CN.json'

vi.mock('@/service/api', () => ({
  fetchAddEcho: vi.fn(),
  fetchUpdateEcho: vi.fn(),
  fetchGetTags: vi.fn().mockResolvedValue({ code: 1, data: [] }),
  fetchGetEchoById: vi.fn(),
  fetchQueryEchos: vi.fn(),
}))

const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { render: () => null } }],
})

let wrapper: VueWrapper
const mountEditor = async () => {
  wrapper = mount(TheEditor, {
    global: {
      plugins: [i18n, router],
      directives: { tooltip: {} },
      stubs: {
        TheMdEditor: { template: '<textarea data-test="text-editor" />' },
        TheEditorButtons: true,
        TheEditorPreview: true,
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
    expect(wrapper.text()).toContain(zhCN.editor.extMusic)
    expect(wrapper.text()).toContain(zhCN.editor.mediaTypeAudio)
    expect(wrapper.find('[data-test="text-editor"]').exists()).toBe(true)
  })

  it('renders the music input on the first update and toggles the panel closed', async () => {
    await mountEditor()
    const music = wrapper.find(`button[aria-label="${zhCN.editor.addMusic}"]`)
    await music.trigger('click')

    expect(useEditorStore().currentMode).toBe(Mode.EXTEN)
    expect(useEditorStore().extensionToAdd.extension_type).toBe(ExtensionType.MUSIC)
    expect(wrapper.find('[data-test="text-editor"]').exists()).toBe(true)
    expect(wrapper.find(`input[placeholder="${zhCN.editor.musicUrlPlaceholder}"]`).exists()).toBe(
      true,
    )

    await music.trigger('click')
    expect(useEditorStore().currentMode).toBe(Mode.ECH0)
    expect(wrapper.find('.editor-shell__panel').exists()).toBe(false)
  })

  it('renders the audio file picker on the first update', async () => {
    await mountEditor()
    await wrapper.find(`button[aria-label="${zhCN.editor.mediaTypeAudio}"]`).trigger('click')

    expect(useEditorStore().currentMode).toBe(Mode.Media)
    expect(useEditorStore().effectiveCategory).toBe(FILE_CATEGORY.AUDIO)
    expect(wrapper.find('[data-test="text-editor"]').exists()).toBe(true)
    expect(wrapper.find('input[type="file"][accept="audio/*"]').exists()).toBe(true)
  })

  it('retains the way back from tag management', async () => {
    useEditorStore().setMode(Mode.TagManage)
    useEchoStore().tagList = [{ id: 'tag-1', name: 'Tag', usage_count: 1, created_at: 1 }]
    wrapper = mount(TheEditorButtons, {
      global: { plugins: [i18n], directives: { tooltip: {} } },
    })
    await wrapper.find(`button[aria-label="${zhCN.editor.backToEditor}"]`).trigger('click')

    expect(useEditorStore().currentMode).toBe(Mode.ECH0)
  })

  it('renders the publish action with the actual locale and no upstream content name', () => {
    wrapper = mount(TheEditorButtons, {
      global: { plugins: [i18n], directives: { tooltip: {} } },
    })

    expect(wrapper.find('button[aria-label="发布"]').text()).toBe('发布')
    expect(wrapper.text()).not.toMatch(/Echo/i)
  })
})
