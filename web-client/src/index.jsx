// Импортируем полифилл process в самом начале
import './polyfills/process';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { MessageProvider } from './contexts/MessageContext';
import { CallProvider } from './contexts/CallContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { logConfig } from './config';

// Включаем подробные предупреждения React в режиме разработки
if (process.env.NODE_ENV === 'development') {
  // Устанавливаем полные тексты ошибок вместо минифицированных
  console.log('🛠️ React запущен в режиме разработки с подробными предупреждениями');
}

// Выводим конфигурацию приложения для отладки
logConfig();

const root = ReactDOM.createRoot(document.getElementById('root'));

// Обратите внимание на порядок вложенности провайдеров:
// 1. AuthProvider должен быть первым (для аутентификации)
// 2. WebSocketProvider после него (использует данные аутентификации)
// 3. MessageProvider после WebSocketProvider (использует WebSocket)
// 4. CallProvider после MessageProvider (использует Message)

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <MessageProvider>
            <CallProvider>
              <App />
              <ToastContainer 
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </CallProvider>
          </MessageProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
