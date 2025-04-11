package models

import (
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Username  string         `json:"username" gorm:"unique;not null"`
	Password  string         `json:"-" gorm:"not null"` // не включаем в JSON
	Role      string         `json:"role" gorm:"not null;default:user"`
	Avatar    string         `json:"avatar,omitempty" gorm:"default:''"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// Хеширование пароля
func (u *User) HashPassword() error {
	// Если пароль уже хеширован (начинается с $2a$), не хешируем повторно
	if len(u.Password) > 0 && u.Password[0:3] == "$2a" {
		return nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// Проверка пароля
func (u *User) CheckPassword(password string) bool {
	// Безопасное логирование (без пароля)
	fmt.Printf("Попытка аутентификации пользователя: %s\n", u.Username)

	// Проверка пароля с помощью bcrypt
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	if err != nil {
		// Отображаем тип ошибки, но не включаем детали, которые могут раскрыть информацию о пароле
		fmt.Printf("Неудачная попытка аутентификации для пользователя %s: %v\n", u.Username, err)
		return false
	}

	fmt.Printf("Успешная аутентификация пользователя: %s\n", u.Username)
	return true
}

// Хук перед созданием - хешируем пароль
func (u *User) BeforeCreate(tx *gorm.DB) error {
	return u.HashPassword()
}
