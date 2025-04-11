// Полифилл для process в браузере
const processPolyfill = {
  env: {
    NODE_ENV: 'production',
    // Добавляем переменные окружения из window.APP_CONFIG, если они доступны
    ...(typeof window !== 'undefined' && window.APP_CONFIG ? {
      REACT_APP_API_URL: window.APP_CONFIG.API_URL || '',
      REACT_APP_WS_URL: window.APP_CONFIG.WS_URL || '',
      REACT_APP_SFU_URL: window.APP_CONFIG.LIVEKIT_URL || '',
    } : {})
  },
  nextTick: callback => setTimeout(callback, 0),
  browser: true,
  version: '',
  platform: 'browser'
};

if (typeof window !== 'undefined') {
  window.process = processPolyfill;
}

export default processPolyfill; 