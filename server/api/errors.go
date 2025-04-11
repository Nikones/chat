package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func SendError(c *gin.Context, status int, code string, message string, details ...any) {
	var detailsData any
	if len(details) > 0 {
		detailsData = details[0]
	}

	c.JSON(status, ErrorResponse{
		Code:    code,
		Message: message,
		Details: detailsData,
	})
}

func SendBadRequest(c *gin.Context, message string, details ...any) {
	SendError(c, http.StatusBadRequest, "BAD_REQUEST", message, details...)
}

func SendUnauthorized(c *gin.Context, message string) {
	SendError(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func SendForbidden(c *gin.Context, message string) {
	SendError(c, http.StatusForbidden, "FORBIDDEN", message)
}

func SendNotFound(c *gin.Context, message string) {
	SendError(c, http.StatusNotFound, "NOT_FOUND", message)
}

func SendInternalError(c *gin.Context, message string) {
	SendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
