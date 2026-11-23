// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

package s3

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/lin-snow/ech0/internal/database"
	"github.com/lin-snow/ech0/internal/migrator/snapshot"
	"github.com/lin-snow/ech0/internal/migrator/spec"
	migratorModel "github.com/lin-snow/ech0/internal/model/migrator"
	"github.com/lin-snow/ech0/internal/storage"
	logUtil "github.com/lin-snow/ech0/pkg/log"
)

const uploadTimeout = 60 * time.Minute

type Exporter struct {
	storageManager *storage.Manager
}

func New(storageManager *storage.Manager) *Exporter {
	return &Exporter{storageManager: storageManager}
}

func (e *Exporter) Export(ctx context.Context, req spec.ExportRequest) (spec.ExportResult, error) {
	emit(req, migratorModel.ExportPhasePacking)
	path, fileName, err := snapshot.Create(snapshot.WithContext(ctx), snapshot.WithConsistentDB(database.SnapshotTo))
	if err != nil {
		return spec.ExportResult{}, err
	}

	var size int64
	if info, statErr := os.Stat(path); statErr == nil {
		size = info.Size()
	}

	if err := e.uploadToS3(ctx, path, fileName); err != nil {
		return spec.ExportResult{}, err
	}

	emit(req, migratorModel.ExportPhaseCompleted)
	return spec.ExportResult{ArtifactPath: path, FileName: fileName, Size: size}, nil
}

func (e *Exporter) uploadToS3(ctx context.Context, artifactPath, fileName string) error {
	if e.storageManager == nil {
		return nil
	}
	selector := e.storageManager.GetSelector()
	if selector == nil || !selector.ObjectEnabled() {
		return nil
	}

	uploadCtx, cancel := context.WithTimeout(ctx, uploadTimeout)
	defer cancel()

	cfg := e.storageManager.GetStorageConfig(uploadCtx)
	if err := snapshot.UploadToS3(uploadCtx, artifactPath, fileName, cfg); err != nil {
		switch {
		case errors.Is(err, context.DeadlineExceeded):
			logUtil.GetLogger().Warn("Failed to upload snapshot to S3: upload timeout reached",
				slog.Duration("timeout", uploadTimeout), logUtil.Err(err))
		case errors.Is(err, context.Canceled):
			logUtil.GetLogger().Warn("Failed to upload snapshot to S3: upload context canceled", logUtil.Err(err))
		default:
			logUtil.GetLogger().Warn("Failed to upload snapshot to S3", logUtil.Err(err))
		}
		return err
	}
	return nil
}

func emit(req spec.ExportRequest, phase string) {
	if req.UpdateProgress != nil {
		req.UpdateProgress(spec.ExportProgress{CurrentPhase: phase})
	}
}
