// Импортируем полифилл process в самом начале
import './polyfills/process';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// Инициализируем приложение с отложенной загрузкой
const renderApp = () => {
  // Находим корневой элемент или создаем его, если не существует
  let rootEl = document.getElementById('root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }

  // Инициализируем React 18 приложение
  const root = ReactDOM.createRoot(rootEl);
  
  // Рендерим приложение со строгим режимом только в процессе разработки
  if (process.env.NODE_ENV === 'development') {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    root.render(<App />);
  }
};

// Запускаем рендеринг когда DOM полностью загружен
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
