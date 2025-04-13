// Импортируем полифилл process в самом начале
import './polyfills/process';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// Включаем подробные предупреждения React в режиме разработки
if (process.env.NODE_ENV === 'development') {
  // Устанавливаем полные тексты ошибок вместо минифицированных
  console.log('🛠️ React запущен в режиме разработки с подробными предупреждениями');
}

// Импортируем провайдеры контекстов
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { MessageProvider } from './contexts/MessageContext';
import { CallProvider } from './contexts/CallContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';

const root = createRoot(document.getElementById('root'));

// Обратите внимание на порядок вложенности провайдеров:
// 1. AuthProvider должен быть первым (для аутентификации)
// 2. WebSocketProvider после него (использует данные аутентификации)
// 3. MessageProvider после WebSocketProvider (использует WebSocket)

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <AdminProvider>
              <MessageProvider>
                <CallProvider>
                  <ChatProvider>
                    <App />
                  </ChatProvider>
                </CallProvider>
              </MessageProvider>
            </AdminProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
