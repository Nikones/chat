package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
	
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	
	"messenger/server/middleware"
)

const (
	// Время ожидания для записи в WebSocket
	writeWait = 10 * time.Second
	
	// Время ожидания для чтения следующего pong
	pongWait = 60 * time.Second
	
	// Частота отправки пингов
	pingPeriod = (pongWait * 9) / 10
	
	// Максимальный размер сообщения
	maxMessageSize = 512 * 1024 // 512KB
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // В продакшене следует ограничить
	},
}

// Клиент WebSocket
type Client struct {
	server *Server
	conn   *websocket.Conn
	send   chan []byte
	userID uint
	authenticated bool // Флаг аутентификации
}

// Типы WebSocket сообщений
type WSMessage struct {
	Type    string          `json:"type"`
	Content json.RawMessage `json:"content"`
}

// Тип сообщения для аутентификации
type AuthMessage struct {
	Token string `json:"token"`
}

// Текстовое сообщение
type TextMessage struct {
	RecipientID uint   `json:"recipient_id"`
	Content     string `json:"content"` // Уже зашифровано клиентом
}

// Предложение звонка
type CallOfferMessage struct {
	RecipientID uint   `json:"recipient_id"`
	SDP         string `json:"sdp"`
}

// Ответ на звонок
type CallAnswerMessage struct {
	RecipientID uint   `json:"recipient_id"`
	SDP         string `json:"sdp"`
}

// ICE кандидат для WebRTC
type ICECandidateMessage struct {
	RecipientID uint   `json:"recipient_id"`
	Candidate   string `json:"candidate"`
}

// Обработчик чтения сообщений
func (c *Client) readPump() {
	defer func() {
		c.server.unregisterClient(c)
		c.conn.Close()
	}()
	
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Ошибка соединения: %v", err)
			}
			break
		}
		
		// Проверяем, аутентифицирован ли клиент
		if !c.authenticated {
			// Пытаемся аутентифицировать
			var msg WSMessage
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("Ошибка разбора сообщения аутентификации: %v", err)
				c.conn.Close()
				break
			}
			
			if msg.Type == "auth" {
				var authMsg AuthMessage
				if err := json.Unmarshal(msg.Content, &authMsg); err != nil {
					log.Printf("Ошибка разбора данных аутентификации: %v", err)
					c.conn.Close()
					break
				}
				
				// Проверка JWT токена
				claims := &middleware.JWTClaims{}
				token, err := jwt.ParseWithClaims(authMsg.Token, claims, func(token *jwt.Token) (interface{}, error) {
					return []byte(c.server.config.JWT.Secret), nil
				})
				
				if err != nil || !token.Valid {
					log.Printf("Неверный токен аутентификации: %v", err)
					c.conn.Close()
					break
				}
				
				// Токен валиден, устанавливаем ID пользователя
				c.userID = claims.UserID
				c.authenticated = true
				
				// Регистрируем клиента
				c.server.registerClient(c)
				
				// Отправляем историю сообщений
				go c.server.sendMessageHistory(c)
				
				log.Printf("Клиент успешно аутентифицирован: пользователь %d", c.userID)
				continue
			} else {
				// Если первое сообщение не аутентификация, закрываем соединение
				log.Printf("Первое сообщение не аутентификация: %v", msg.Type)
				c.conn.Close()
				break
			}
		}
		
		// Если клиент аутентифицирован, обрабатываем сообщение
		c.server.processMessage(c, message)
	}
}

// Обработчик отправки сообщений
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Канал закрыт
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			
			// Добавляем в очередь ожидающие сообщения
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(<-c.send)
			}
			
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Обработчик WebSocket соединения
func (s *Server) handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Ошибка при обновлении до WebSocket:", err)
		return
	}
	
	// Создаем клиента без привязки к пользователю (пока)
	client := &Client{
		server: s,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: 0, // Устанавливаем после аутентификации
		authenticated: false,
	}
	
	log.Println("Новое WebSocket соединение установлено. Ожидание аутентификации...")
	
	// Запускаем горутины
	go client.writePump()
	go client.readPump()
}
