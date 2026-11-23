// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

package zip

import (
	"archive/zip"
	"context"
	"fmt"
	"io"

	virefs "github.com/lin-snow/ech0/pkg/virefs"
)

const (
	maxEntries      = 10000
	maxEntrySize    = 256 << 20
	maxExpandedSize = 1 << 30
)

func Unpack(ctx context.Context, r io.ReaderAt, size int64, dst virefs.FS, prefix string, opts ...virefs.PutOption) error {
	zr, err := zip.NewReader(r, size)
	if err != nil {
		return err
	}

	cleanedPrefix, err := virefs.CleanKey(prefix)
	if err != nil {
		return err
	}

	if len(zr.File) > maxEntries {
		return fmt.Errorf("zip: too many entries: %d", len(zr.File))
	}
	var expanded int64
	for _, f := range zr.File {
		if err := ctx.Err(); err != nil {
			return err
		}

		if f.FileInfo().IsDir() {
			continue
		}
		if f.UncompressedSize64 > maxEntrySize || expanded+int64(f.UncompressedSize64) > maxExpandedSize {
			return fmt.Errorf("zip: expanded data exceeds safety limit")
		}

		name, err := virefs.CleanKey(f.Name)
		if err != nil || name == "" {
			continue
		}

		dstKey := name
		if cleanedPrefix != "" {
			dstKey = cleanedPrefix + "/" + name
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		limited := io.LimitReader(rc, maxEntrySize+1)
		putErr := dst.Put(ctx, dstKey, limited, opts...)
		rc.Close()
		if putErr != nil {
			return putErr
		}
		expanded += int64(f.UncompressedSize64)
	}
	return nil
}
