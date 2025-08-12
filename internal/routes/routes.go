package routes

import (
	"planner/internal/handlers"
	"planner/internal/middleware"

	"github.com/gin-gonic/gin"
)

// Setup 设置所有路由
func Setup(router *gin.Engine) {
	// API路由组
	api := router.Group("/api/v1")
	{
		// 健康检查
		api.GET("/health", handlers.Health)
		api.GET("/status", handlers.GetSystemStatus)

		// 认证路由
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/logout", middleware.Auth(), handlers.Logout)
			auth.POST("/refresh", handlers.RefreshToken)
			auth.GET("/profile", middleware.Auth(), handlers.GetProfile)
			auth.PUT("/profile", middleware.Auth(), handlers.UpdateProfile)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.Auth())
		{
			// 计划管理
			plans := protected.Group("/plans")
			{
				plans.POST("", handlers.CreatePlan)
				plans.GET("", handlers.GetMyPlans)
				plans.GET("/user/:userId", handlers.GetUserPlans)
				plans.GET("/:planId", handlers.GetPlan)
				plans.PUT("/:planId", handlers.UpdatePlan)
				plans.DELETE("/:planId", handlers.DeletePlan)
				plans.POST("/:planId/duplicate", handlers.DuplicatePlan)
				plans.POST("/:planId/share", handlers.SharePlan)
			}

			// 旅游元素管理
			items := protected.Group("/items")
			{
				items.POST("/plan/:planId", handlers.CreateTravelItem)
				items.GET("/plan/:planId", handlers.GetTravelItems)
				items.GET("/:itemId", handlers.GetTravelItem)
				items.PUT("/:itemId", handlers.UpdateTravelItem)
				items.DELETE("/:itemId", handlers.DeleteTravelItem)
				items.POST("/batch", handlers.BatchCreateItems)
				items.PUT("/batch", handlers.BatchUpdateItems)
				items.DELETE("/batch", handlers.BatchDeleteItems)
				items.PUT("/plan/:planId/reorder", handlers.ReorderItems)
				items.PATCH("/:itemId/status", handlers.UpdateItemStatus)
			}

			// 住宿管理
			accommodation := protected.Group("/accommodation")
			{
				accommodation.GET("/plan/:planId", handlers.GetAccommodations)
				accommodation.POST("/plan/:planId", handlers.CreateAccommodation)
				accommodation.GET("/:itemId", handlers.GetAccommodationDetails)
				accommodation.PUT("/:itemId", handlers.UpdateAccommodationDetails)
			}

			// 交通管理
			transport := protected.Group("/transport")
			{
				transport.GET("/plan/:planId", handlers.GetTransports)
				transport.POST("/plan/:planId", handlers.CreateTransport)
				transport.GET("/:itemId", handlers.GetTransportDetails)
				transport.PUT("/:itemId", handlers.UpdateTransportDetails)
			}

			// 景点管理
			attractions := protected.Group("/attractions")
			{
				attractions.GET("/plan/:planId", handlers.GetAttractions)
				attractions.POST("/plan/:planId", handlers.CreateAttraction)
				attractions.GET("/:itemId", handlers.GetAttractionDetails)
				attractions.PUT("/:itemId", handlers.UpdateAttractionDetails)
			}

			// 关联管理
			relations := protected.Group("/relations")
			{
				relations.POST("", handlers.CreateItemRelation)
				relations.GET("/item/:itemId", handlers.GetItemRelations)
				relations.DELETE("/:relationId", handlers.DeleteItemRelation)
			}

			// 标注管理
			annotations := protected.Group("/annotations")
			{
				annotations.POST("/item/:itemId", handlers.AddAnnotation)
				annotations.GET("/item/:itemId", handlers.GetAnnotations)
				annotations.PUT("/:annotationId", handlers.UpdateAnnotation)
				annotations.DELETE("/:annotationId", handlers.DeleteAnnotation)
			}

			// 附件管理
			attachments := protected.Group("/attachments")
			{
				attachments.POST("/item/:itemId/upload", handlers.UploadAttachment)
				attachments.GET("/item/:itemId", handlers.GetAttachments)
				attachments.DELETE("/:attachmentId", handlers.DeleteAttachment)
			}

			// 预算管理
			budget := protected.Group("/budget")
			{
				budget.GET("/plan/:planId", handlers.GetBudgetSummary)
				budget.POST("/plan/:planId/items", handlers.AddBudgetItem)
				budget.GET("/plan/:planId/items", handlers.GetBudgetItems)
				budget.PUT("/items/:itemId", handlers.UpdateBudgetItem)
				budget.DELETE("/items/:itemId", handlers.DeleteBudgetItem)
			}

			// 行程视图
			itinerary := protected.Group("/itinerary")
			{
				itinerary.GET("/plan/:planId/daily", handlers.GetDailyItinerary)
				itinerary.GET("/plan/:planId/timeline", handlers.GetTimeline)
				itinerary.POST("/plan/:planId/optimize", handlers.OptimizeItinerary)
			}

			// 统计分析
			analytics := protected.Group("/analytics")
			{
				analytics.GET("/plan/:planId/summary", handlers.GetPlanSummary)
				analytics.GET("/plan/:planId/statistics", handlers.GetPlanStatistics)
			}

			// 导入导出
			io := protected.Group("/io")
			{
				io.GET("/plan/:planId/export/json", handlers.ExportPlanJSON)
				io.GET("/plan/:planId/export/pdf", handlers.ExportPlanPDF)
				io.POST("/plan/import/json", handlers.ImportPlanJSON)
			}
		}

		// 管理员接口
		admin := api.Group("/admin")
		admin.Use(middleware.Auth(), middleware.Admin())
		{
			admin.GET("/users", handlers.ListUsers)
			admin.GET("/users/:userId", handlers.GetUserDetails)
			admin.PUT("/users/:userId/status", handlers.UpdateUserStatus)
			admin.GET("/plans", handlers.ListAllPlans)
			admin.DELETE("/plans/:planId", handlers.AdminDeletePlan)
			admin.GET("/statistics", handlers.GetSystemStatistics)
		}
	}

	// WebSocket端点
	router.GET("/ws", middleware.Auth(), handlers.HandleWebSocket)
}
