package logger

import (
	"os"
	"sync"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	// Глобальный логгер
	log  *zap.SugaredLogger
	once sync.Once
)

// Уровни логирования
type Level string

const (
	DebugLevel Level = "debug"
	InfoLevel  Level = "info"
	WarnLevel  Level = "warn"
	ErrorLevel Level = "error"
	FatalLevel Level = "fatal"
)

// Инициализация логгера
func Init(level Level, isProduction bool) {
	once.Do(func() {
		// Определяем уровень логирования
		var zapLevel zapcore.Level
		switch level {
		case DebugLevel:
			zapLevel = zapcore.DebugLevel
		case InfoLevel:
			zapLevel = zapcore.InfoLevel
		case WarnLevel:
			zapLevel = zapcore.WarnLevel
		case ErrorLevel:
			zapLevel = zapcore.ErrorLevel
		case FatalLevel:
			zapLevel = zapcore.FatalLevel
		default:
			zapLevel = zapcore.InfoLevel
		}

		// Создаем конфигурацию для продакшн или разработки
		var config zap.Config
		if isProduction {
			config = zap.NewProductionConfig()
			config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		} else {
			config = zap.NewDevelopmentConfig()
			config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339)
			config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		}

		// Если указана переменная окружения для вывода в JSON
		if os.Getenv("LOG_JSON") == "true" {
			config.Encoding = "json"
		}

		config.Level = zap.NewAtomicLevelAt(zapLevel)

		// Создаем логгер
		logger, err := config.Build()
		if err != nil {
			panic(err)
		}

		log = logger.Sugar()
	})
}

// Получение глобального логгера
func GetLogger() *zap.SugaredLogger {
	if log == nil {
		// Если логгер не инициализирован, создаем стандартный
		Init(InfoLevel, false)
	}
	return log
}

// Создание нового логгера с контекстом
func WithContext(fields map[string]interface{}) *zap.SugaredLogger {
	if log == nil {
		Init(InfoLevel, false)
	}

	args := make([]interface{}, 0, len(fields)*2)
	for k, v := range fields {
		args = append(args, k, v)
	}

	return log.With(args...)
}

// Логирование

func Debug(args ...interface{}) {
	GetLogger().Debug(args...)
}

func Debugf(format string, args ...interface{}) {
	GetLogger().Debugf(format, args...)
}

func Info(args ...interface{}) {
	GetLogger().Info(args...)
}

func Infof(format string, args ...interface{}) {
	GetLogger().Infof(format, args...)
}

func Warn(args ...interface{}) {
	GetLogger().Warn(args...)
}

func Warnf(format string, args ...interface{}) {
	GetLogger().Warnf(format, args...)
}

func Error(args ...interface{}) {
	GetLogger().Error(args...)
}

func Errorf(format string, args ...interface{}) {
	GetLogger().Errorf(format, args...)
}

func Fatal(args ...interface{}) {
	GetLogger().Fatal(args...)
}

func Fatalf(format string, args ...interface{}) {
	GetLogger().Fatalf(format, args...)
}

// Методы с контекстом

func DebugWithContext(ctx map[string]interface{}, args ...interface{}) {
	WithContext(ctx).Debug(args...)
}

func DebugfWithContext(ctx map[string]interface{}, format string, args ...interface{}) {
	WithContext(ctx).Debugf(format, args...)
}

func InfoWithContext(ctx map[string]interface{}, args ...interface{}) {
	WithContext(ctx).Info(args...)
}

func InfofWithContext(ctx map[string]interface{}, format string, args ...interface{}) {
	WithContext(ctx).Infof(format, args...)
}

func WarnWithContext(ctx map[string]interface{}, args ...interface{}) {
	WithContext(ctx).Warn(args...)
}

func WarnfWithContext(ctx map[string]interface{}, format string, args ...interface{}) {
	WithContext(ctx).Warnf(format, args...)
}

func ErrorWithContext(ctx map[string]interface{}, args ...interface{}) {
	WithContext(ctx).Error(args...)
}

func ErrorfWithContext(ctx map[string]interface{}, format string, args ...interface{}) {
	WithContext(ctx).Errorf(format, args...)
}

func FatalWithContext(ctx map[string]interface{}, args ...interface{}) {
	WithContext(ctx).Fatal(args...)
}

func FatalfWithContext(ctx map[string]interface{}, format string, args ...interface{}) {
	WithContext(ctx).Fatalf(format, args...)
}
