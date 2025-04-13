// Добавляем глобальную отладку WebSocket для отслеживания всех соединений
const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  // Выделяем отдельно URL и параметры для лучшей читаемости в логах
  const urlParts = url.split('?');
  const baseUrl = urlParts[0];
  const params = urlParts[1] || '';
  const hasToken = params.includes('token=');
  
  console.log('GLOBAL DEBUG: WebSocket создается:', { 
    baseUrl,
    hasToken,
    params: hasToken ? 'token=***СКРЫТО***' : params,
    protocols 
  });
  
  const socket = protocols ? new originalWebSocket(url, protocols) : new originalWebSocket(url);
  
  const originalOnOpen = socket.onopen;
  const originalOnClose = socket.onclose;
  const originalOnError = socket.onerror;
  
  socket.onopen = function(event) {
    console.log('GLOBAL DEBUG: WebSocket открыт:', { 
      baseUrl,
      hasToken,
      protocols 
    });
    if (originalOnOpen) {
      originalOnOpen.call(this, event);
    }
  };
  
  socket.onclose = function(event) {
    console.log('GLOBAL DEBUG: WebSocket закрыт:', { 
      baseUrl, 
      hasToken,
      protocols, 
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    if (originalOnClose) {
      originalOnClose.call(this, event);
    }
  };
  
  socket.onerror = function(event) {
    console.error('GLOBAL DEBUG: WebSocket ошибка:', { 
      baseUrl, 
      hasToken,
      protocols,
      error: event
    });
    if (originalOnError) {
      originalOnError.call(this, event);
    }
  };
  
  return socket;
};

// Запускаем приложение после добавления отладки 