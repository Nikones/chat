package main

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// Аддон для добавления ping/pong для WebSocket соединений
// Копировать в соответствующее место в коде сервера

// setupPingPongHandlers настраивает обработчики ping/pong для поддержания
// долгоживущих WebSocket соединений через прокси
func setupPingPongHandlers(conn *websocket.Conn) {
	// Настройка обработчика ping (когда клиент отправляет ping, сервер отвечает pong)
	conn.SetPingHandler(func(appData string) error {
		log.Printf("Получен ping от клиента, отправляем pong")
		err := conn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(10*time.Second))
		if err != nil {
			log.Printf("Ошибка отправки pong: %v", err)
		}
		return nil
	})

	// Настройка обработчика pong (когда сервер получает ответ на ping)
	conn.SetPongHandler(func(appData string) error {
		log.Printf("Получен pong от клиента")
		return nil
	})

	// Запускаем горутину, которая будет отправлять ping клиенту
	go func() {
		ticker := time.NewTicker(30 * time.Second) // Отправка ping каждые 30 секунд
		defer ticker.Stop()

		for {
			<-ticker.C
			// Отправляем ping клиенту
			if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(10*time.Second)); err != nil {
				log.Printf("Ошибка отправки ping: %v", err)
				return
			}
			log.Printf("Отправлен ping клиенту")
		}
	}()
}

/*
// Пример использования в обработчике WebSocket:

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Ошибка при апгрейде соединения: %v", err)
		return
	}
	defer conn.Close()

	// Настройка обработчиков ping/pong
	setupPingPongHandlers(conn)

	// Остальной код обработки WebSocket
	// ...
}
*/
