package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var encryptionKey []byte

// InitCrypto инициализирует криптографический модуль
func InitCrypto() error {
	// Получаем ключ из переменной окружения
	keyBase64 := os.Getenv("SERVER_ENCRYPTION_KEY")
	if keyBase64 == "" {
		return errors.New("переменная окружения SERVER_ENCRYPTION_KEY не задана")
	}

	// Декодируем Base64 в бинарный ключ
	var err error
	encryptionKey, err = base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return fmt.Errorf("ошибка декодирования SERVER_ENCRYPTION_KEY из Base64: %w", err)
	}

	// Проверяем длину ключа (16, 24 или 32 байта для AES-128, AES-192, AES-256)
	keySize := len(encryptionKey)
	if keySize != 16 && keySize != 24 && keySize != 32 {
		return fmt.Errorf("некорректная длина ключа: %d байт (должно быть 16, 24 или 32)", keySize)
	}

	return nil
}

// EncryptAES_GCM шифрует данные с использованием AES-GCM и возвращает nonce и шифротекст
func EncryptAES_GCM(plaintext []byte) ([]byte, []byte, error) {
	if encryptionKey == nil {
		return nil, nil, errors.New("криптографический модуль не инициализирован")
	}

	// Создаем шифр AES
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, nil, err
	}

	// Создаем режим GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}

	// Генерируем случайный nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, err
	}

	// Шифруем данные
	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)
	return nonce, ciphertext, nil
}

// DecryptAES_GCM дешифрует данные, зашифрованные с помощью AES-GCM
func DecryptAES_GCM(nonce []byte, ciphertext []byte) ([]byte, error) {
	if encryptionKey == nil {
		return nil, errors.New("криптографический модуль не инициализирован")
	}

	// Создаем шифр AES
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, err
	}

	// Создаем режим GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Проверяем размер nonce
	if len(nonce) != gcm.NonceSize() {
		return nil, errors.New("неверный размер nonce")
	}

	// Дешифруем данные
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("ошибка дешифрования: %w", err)
	}

	return plaintext, nil
}

// Encrypt шифрует данные с AES-GCM
// Это обертка для обратной совместимости, использующая EncryptAES_GCM
func Encrypt(plaintext []byte) ([]byte, error) {
	if encryptionKey == nil {
		return nil, errors.New("криптографический модуль не инициализирован")
	}

	// Создаем шифр AES
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, err
	}

	// Создаем режим GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Генерируем nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Шифруем и добавляем nonce в начало результата
	// Это позволяет хранить зашифрованные данные в одном поле
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// Decrypt дешифрует данные, зашифрованные с помощью Encrypt
func Decrypt(ciphertext []byte) ([]byte, error) {
	if encryptionKey == nil {
		return nil, errors.New("криптографический модуль не инициализирован")
	}

	// Создаем шифр AES
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, err
	}

	// Создаем режим GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Проверяем размер
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("некорректный размер шифротекста")
	}

	// Извлекаем nonce из начала шифротекста
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Дешифруем
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("ошибка дешифрования: %w", err)
	}

	return plaintext, nil
}

// EncryptString шифрует строку и возвращает результат в формате "base64(nonce):base64(ciphertext)"
func EncryptString(plaintext string) (string, error) {
	nonce, encrypted, err := EncryptAES_GCM([]byte(plaintext))
	if err != nil {
		return "", err
	}
	// Сохраняем как base64(nonce):base64(ciphertext) для удобства, если нужно хранить в строке
	return base64.StdEncoding.EncodeToString(nonce) + ":" + base64.StdEncoding.EncodeToString(encrypted), nil
}

// DecryptString расшифровывает строку формата base64(nonce):base64(ciphertext)
func DecryptString(encryptedString string) (string, error) {
	parts := strings.SplitN(encryptedString, ":", 2)
	if len(parts) != 2 {
		return "", errors.New("неверный формат зашифрованной строки")
	}

	nonce, err := base64.StdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("ошибка декодирования nonce: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("ошибка декодирования шифротекста: %w", err)
	}

	decryptedBytes, err := DecryptAES_GCM(nonce, ciphertext)
	if err != nil {
		return "", err
	} // Ошибка расшифровки уже обернута

	return string(decryptedBytes), nil
}

// Простая проверка пароля (оставим как есть)
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Хеширование пароля (оставим как есть)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
