// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

package router

import (
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lin-snow/ech0/internal/authz"
	"github.com/lin-snow/ech0/internal/config"
	"github.com/lin-snow/ech0/internal/database"
	"github.com/lin-snow/ech0/internal/handler"
	"github.com/lin-snow/ech0/internal/mcp"
	"github.com/lin-snow/ech0/internal/middleware"
	fileModel "github.com/lin-snow/ech0/internal/model/file"
	openapiCatalog "github.com/lin-snow/ech0/internal/openapi/catalog"
	authService "github.com/lin-snow/ech0/internal/service/auth"
	"github.com/lin-snow/ech0/pkg/viewer"
)

type AppRouterGroup struct {
	ResourceGroup           *gin.RouterGroup
	PublicRouterGroup       *gin.RouterGroup
	AuthRouterGroup         *gin.RouterGroup
	OptionalAuthRouterGroup *gin.RouterGroup
	WSRouterGroup           *gin.RouterGroup
	MCPRouterGroup          *gin.RouterGroup
}

func SetupRouter(r *gin.Engine, h *handler.Bundle, mwDeps *middleware.Deps) {
	setupTemplateRoutes(r, h)
	setupStaticFiles(r, mwDeps)
	setupMiddleware(r)
	catalogState := newCatalogState()
	r.Use(catalogState.middleware())
	groups := setupRouterGroup(r, mwDeps)
	api := setupHumaAPI(r)

	revoker := revokerOf(mwDeps)
	setupResourceRoutes(groups, h)
	setupAuthRoutes(groups, h)
	setupCommentRoutes(groups, h)
	setupFileRoutes(groups, h)
	setupDashboardRoutes(groups, h, revoker)
	setupCopilotRoutes(groups, h)
	registerOperations(api, h, revoker)
	setupMigrationRoutes(groups, h)
	setupMCPRoutes(groups, h)
	setupOAuthServerRoutes(r, groups, h)

	catalogState.build(api)
	r.GET("/api"+openapiCatalog.RoutePath, catalogState.handle)
}

func setupStaticFiles(r *gin.Engine, mwDeps *middleware.Deps) {
	root := config.Config().Storage.DataRoot
	if root == "" {
		root = "data/files"
	}
	revoker := revokerOf(mwDeps)
	r.Group("api/files", middleware.OptionalAuth(revoker), protectedStaticFile(), middleware.StaticFileSecurity()).StaticFS("/", http.Dir(root))
}

func protectedStaticFile() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if strings.HasSuffix(ctx.Request.URL.Path, "/") {
			ctx.Status(http.StatusNotFound)
			ctx.Abort()
			return
		}
		name := strings.Trim(strings.TrimPrefix(path.Clean(ctx.Request.URL.Path), "/api/files"), "/")
		for _, privateDir := range []string{"snapshots", "capsules", "tmp"} {
			if name == privateDir || strings.HasPrefix(name, privateDir+"/") {
				ctx.Status(http.StatusNotFound)
				ctx.Abort()
				return
			}
		}

		key := strings.TrimPrefix(name, "images/")
		key = strings.TrimPrefix(key, "audios/")
		key = strings.TrimPrefix(key, "videos/")
		key = strings.TrimPrefix(key, "documents/")
		key = strings.TrimPrefix(key, "files/")
		if key == "" || database.GetDB() == nil {
			ctx.Next()
			return
		}

		var privateCount, publicCount int64
		db := database.GetDB()
		if err := db.Model(&fileModel.EchoFile{}).
			Joins("JOIN echos ON echos.id = echo_files.echo_id").
			Joins("JOIN files ON files.id = echo_files.file_id").
			Where("files.storage_type = ? AND files.key = ? AND echos.private = ?", "local", key, true).
			Count(&privateCount).Error; err != nil {
			ctx.Status(http.StatusNotFound)
			ctx.Abort()
			return
		}
		if privateCount == 0 {
			ctx.Next()
			return
		}
		if err := db.Model(&fileModel.EchoFile{}).
			Joins("JOIN echos ON echos.id = echo_files.echo_id").
			Joins("JOIN files ON files.id = echo_files.file_id").
			Where("files.storage_type = ? AND files.key = ? AND echos.private = ?", "local", key, false).
			Count(&publicCount).Error; err != nil {
			ctx.Status(http.StatusNotFound)
			ctx.Abort()
			return
		}
		if publicCount > 0 {
			ctx.Next()
			return
		}

		v := viewer.MustFromContext(ctx.Request.Context())
		if v.IsAdmin() || authz.Allows(v.Scopes(), []string{authz.ScopeEchoPrivate}) {
			ctx.Next()
			return
		}
		ctx.Status(http.StatusNotFound)
		ctx.Abort()
	}
}

func revokerOf(mwDeps *middleware.Deps) authService.TokenRevoker {
	if mwDeps != nil {
		return mwDeps.TokenRevoker
	}
	return nil
}

func setupRouterGroup(r *gin.Engine, mwDeps *middleware.Deps) *AppRouterGroup {
	revoker := revokerOf(mwDeps)

	resource := r.Group("/")
	public := r.Group("/api")
	auth := r.Group("/api")
	auth.Use(middleware.NoCache(), middleware.RequireAuth(revoker))
	optionalAuth := r.Group("/api")
	optionalAuth.Use(middleware.NoCache(), middleware.OptionalAuth(revoker))
	ws := r.Group("/ws")
	mcpGroup := r.Group(mcp.MCPEndpointPath)
	mcpGroup.Use(
		middleware.NoCache(),
		middleware.RequireAuthWithChallenge(
			revoker,
			middleware.ResourceMetadataChallenge("/.well-known/oauth-protected-resource/mcp"),
		),
	)
	return &AppRouterGroup{
		ResourceGroup:           resource,
		PublicRouterGroup:       public,
		AuthRouterGroup:         auth,
		OptionalAuthRouterGroup: optionalAuth,
		WSRouterGroup:           ws,
		MCPRouterGroup:          mcpGroup,
	}
}
