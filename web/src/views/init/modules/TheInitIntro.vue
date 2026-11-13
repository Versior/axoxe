<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="mb-3 text-center">
    <h1 class="mb-2 flex justify-center text-[var(--color-text-primary)]">
      <span class="init-wordmark" role="img" aria-label="Axoxe" />
    </h1>
    <h2 class="text-sm font-semibold text-[var(--color-text-muted)] mb-1">
      {{ t('init.introHeading') }}
    </h2>
    <p class="text-xs text-[var(--color-text-secondary)] leading-5">
      {{ t('init.introDescription') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.init-wordmark {
  display: block;
  width: 11rem;
  height: 3.1rem;
  background-color: currentColor;
  mask: url('/axoxe-wordmark.svg') center / contain no-repeat;
}
</style>
