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
	authModel "github.com/lin-snow/ech0/internal/model/auth"
	fileModel "github.com/lin-snow/ech0/internal/model/file"
	openapiCatalog "github.com/lin-snow/ech0/internal/openapi/catalog"
	authService "github.com/lin-snow/ech0/internal/service/auth"
	"github.com/lin-snow/ech0/internal/storage"
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
	api := setupHumaAPI(r, mwDeps.Limiter)

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

// setupStaticFiles serves uploaded media straight off disk. It is deliberately
// registered outside every API group and without the request budget: media
// delivery is bandwidth-bounded by the object itself, and the route only
// exposes the media prefixes (never artifacts, never listings).
func setupStaticFiles(r *gin.Engine, mwDeps *middleware.Deps) {
	root := config.Config().Storage.DataRoot
	if root == "" {
		root = "data/files"
	}
	registerStaticFiles(r, root, mwDeps)
}

// registerStaticFiles mounts the unauthenticated media route. Only the storage
// schema's category directories are served; directories themselves and any
// other path under the root answer 404.
func registerStaticFiles(r *gin.Engine, root string, mwDeps ...*middleware.Deps) {
	group := r.Group("api/files")
	if len(mwDeps) > 0 {
		group.Use(middleware.OptionalAuth(revokerOf(mwDeps[0])), protectedStaticFile())
	}
	group.Use(middleware.StaticFileSecurity()).StaticFS("/", storage.NewPublicFS(root))
}

// protectedStaticFile keeps local attachments referenced only by private
// echoes behind the same viewer boundary as the echo itself. Public echoes
// sharing a file keep it readable, and external object-store URLs do not pass
// through this local route.
func protectedStaticFile() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		name := strings.Trim(strings.TrimPrefix(path.Clean(ctx.Request.URL.Path), "/api/files"), "/")
		key := name
		for _, prefix := range storage.PublicPathPrefixes() {
			if strings.HasPrefix(key, prefix) {
				key = strings.TrimPrefix(key, prefix)
				break
			}
		}
		if key == "" || database.GetDB() == nil {
			ctx.Next()
			return
		}

		var privateCount, publicCount int64
		db := database.GetDB()
		query := db.Model(&fileModel.EchoFile{}).
			Joins("JOIN echos ON echos.id = echo_files.echo_id").
			Joins("JOIN files ON files.id = echo_files.file_id").
			Where("files.storage_type = ? AND files.key = ?", storage.StorageTypeLocal, key)
		if err := query.Where("echos.private = ?", true).Count(&privateCount).Error; err != nil {
			ctx.Status(http.StatusNotFound)
			ctx.Abort()
			return
		}
		if privateCount == 0 {
			ctx.Next()
			return
		}
		if err := query.Where("echos.private = ?", false).Count(&publicCount).Error; err != nil {
			ctx.Status(http.StatusNotFound)
			ctx.Abort()
			return
		}
		if publicCount > 0 {
			ctx.Next()
			return
		}

		v := viewer.MustFromContext(ctx.Request.Context())
		if v.IsAdmin() || v.TokenType() == authModel.TokenTypeSession || authz.Has(v.Scopes(), authz.ScopeEchoPrivate) {
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

	budget := middleware.Budget(mwDeps.Limiter)

	resource := r.Group("/")
	public := r.Group("/api")
	public.Use(budget)
	auth := r.Group("/api")
	auth.Use(middleware.NoCache(), middleware.RequireAuth(revoker), budget)
	optionalAuth := r.Group("/api")
	optionalAuth.Use(middleware.NoCache(), middleware.OptionalAuth(revoker), budget)
	ws := r.Group("/ws")
	mcpGroup := r.Group(mcp.MCPEndpointPath)
	mcpGroup.Use(
		middleware.NoCache(),
		middleware.RequireAuthWithChallenge(
			revoker,
			middleware.ResourceMetadataChallenge("/.well-known/oauth-protected-resource/mcp"),
		),
		budget,
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
