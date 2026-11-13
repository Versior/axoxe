// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 AXOXE contributors

export function Wordmark() {
  return (
    <span
      role="img"
      aria-label="Axoxe"
      style={{
        display: 'inline-block',
        width: 112,
        height: 31,
        backgroundColor: 'currentColor',
        mask: 'url(./wordmark.svg) center / contain no-repeat',
      }}
    />
  )
}
