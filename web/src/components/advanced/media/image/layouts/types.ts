// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

export type GalleryOpenHandler = (startIndex: number, sourceElement?: HTMLElement | null) => void

export type GalleryImageHelperProps = {
  images: App.Api.AXOXE.FileObject[]
  resolvedSrcs: string[]
  getAlt: (idx: number) => string
  isLoaded: (image: App.Api.AXOXE.FileObject, idx: number) => boolean
  markLoaded: (image: App.Api.AXOXE.FileObject, idx: number) => void
  open: GalleryOpenHandler
  priority?: boolean
}

export type GalleryWithImageKeyProps = GalleryImageHelperProps & {
  getImageKey: (image: App.Api.AXOXE.FileObject, idx: number) => string
}

export type GalleryWithAspectRatioProps = GalleryImageHelperProps & {
  getAspectRatioStyle: (
    image: App.Api.AXOXE.FileObject,
    loaded: boolean,
  ) => Record<string, string> | undefined
}

export type GalleryHorizontalProps = GalleryWithImageKeyProps & {
  getHorizontalAspectStyle: (
    image: App.Api.AXOXE.FileObject,
    loaded: boolean,
  ) => Record<string, string> | undefined
}

export type GalleryStackProps = GalleryWithImageKeyProps

export type GalleryWaterfallProps = GalleryWithImageKeyProps & {
  getAspectRatioStyle: (
    image: App.Api.AXOXE.FileObject,
    loaded: boolean,
  ) => Record<string, string> | undefined
}
