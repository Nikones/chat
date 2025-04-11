package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

var (
	serverKey []byte
	gcm       cipher.AEAD
)

// InitSSE инициализирует систему шифрования на стороне сервера
func InitSSE(key string) error {
	decodedKey, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return err
	}

	block, err := aes.NewCipher(decodedKey)
	if err != nil {
		return err
	}

	gcm, err = cipher.NewGCM(block)
	if err != nil {
		return err
	}

	serverKey = decodedKey
	return nil
}

// Encrypt шифрует данные используя AES-GCM
func Encrypt(plaintext []byte) ([]byte, error) {
	if gcm == nil {
		return nil, errors.New("SSE не инициализирован")
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// Decrypt расшифровывает данные
func Decrypt(ciphertext []byte) ([]byte, error) {
	if gcm == nil {
		return nil, errors.New("SSE не инициализирован")
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("некорректный размер шифротекста")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
