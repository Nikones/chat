/**
 * Утилиты для работы с WebRTC
 */

/**
 * Создает новое соединение RTCPeerConnection
 * @param {Function} onIceCandidate - Обработчик события обнаружения ICE кандидата
 * @param {Function} onTrack - Обработчик события добавления медиа-трека
 * @returns {RTCPeerConnection} - Созданное соединение
 */
export const createPeerConnection = (onIceCandidate, onTrack) => {
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Здесь можно добавить TURN-серверы для обхода NAT
      // { urls: 'turn:turn.example.com', username: 'user', credential: 'pass' }
    ]
  };

  const pc = new RTCPeerConnection(config);

  // Обработчик события обнаружения ICE кандидата
  pc.onicecandidate = (event) => {
    if (typeof onIceCandidate === 'function') {
      onIceCandidate(event.candidate);
    }
  };

  // Обработчик события установления соединения
  pc.onconnectionstatechange = (event) => {
    console.log('Состояние соединения:', pc.connectionState);
  };

  // Обработчик события получения трека от удаленного пира
  pc.ontrack = (event) => {
    if (typeof onTrack === 'function') {
      onTrack(event.streams[0]);
    }
  };

  return pc;
};

/**
 * Получает локальный медиа-поток (аудио/видео)
 * @param {boolean} audio - Флаг запроса аудио-трека
 * @param {boolean} video - Флаг запроса видео-трека
 * @returns {Promise<MediaStream>} - Медиа-поток с локальной камеры/микрофона
 */
export const getLocalMedia = async (audio = true, video = true) => {
  try {
    const constraints = {
      audio: audio ? {
        echoCancellation: true, 
        noiseSuppression: true,
        autoGainControl: true
      } : false,
      video: video ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user' // 'user' для фронтальной, 'environment' для основной камеры
      } : false
    };

    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error('Ошибка получения медиа-потока:', error);
    throw error;
  }
};

/**
 * Добавляет треки из локального потока в RTCPeerConnection
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @param {MediaStream} stream - Локальный медиа-поток
 */
export const addLocalTracks = (peerConnection, stream) => {
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });
};

/**
 * Создает SDP-предложение
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @returns {Promise<RTCSessionDescription>} - SDP-предложение
 */
export const createOffer = async (peerConnection) => {
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch (error) {
    console.error('Ошибка создания предложения:', error);
    throw error;
  }
};

/**
 * Создает SDP-ответ на предложение
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @param {RTCSessionDescription} offer - Полученное SDP-предложение
 * @returns {Promise<RTCSessionDescription>} - SDP-ответ
 */
export const createAnswer = async (peerConnection, offer) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    return answer;
  } catch (error) {
    console.error('Ошибка создания ответа:', error);
    throw error;
  }
};

/**
 * Обрабатывает полученный SDP-ответ
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @param {RTCSessionDescription} answer - Полученный SDP-ответ
 */
export const handleAnswer = async (peerConnection, answer) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('Ошибка обработки ответа:', error);
    throw error;
  }
};

/**
 * Добавляет ICE-кандидат к соединению
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @param {RTCIceCandidate} candidate - ICE-кандидат
 */
export const addIceCandidate = async (peerConnection, candidate) => {
  try {
    if (!candidate) return;
    
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Ошибка добавления ICE-кандидата:', error);
    throw error;
  }
};

/**
 * Закрывает WebRTC соединение и освобождает ресурсы
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @param {MediaStream} localStream - Локальный медиа-поток для остановки треков
 */
export const closeConnection = (peerConnection, localStream) => {
  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    
    // Закрываем соединение
    if (peerConnection.signalingState !== 'closed') {
      peerConnection.close();
    }
  }
  
  // Останавливаем все локальные треки
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
};

/**
 * Получает статистику соединения
 * @param {RTCPeerConnection} peerConnection - WebRTC соединение
 * @returns {Promise<Object>} - Статистика соединения
 */
export const getConnectionStats = async (peerConnection) => {
  if (!peerConnection) return null;
  
  try {
    const stats = await peerConnection.getStats();
    const result = {};
    
    stats.forEach(report => {
      result[report.id] = report;
    });
    
    return result;
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return null;
  }
};

/**
 * Изменяет ограничения для видеотрека (например, разрешение)
 * @param {MediaStreamTrack} videoTrack - Видеотрек
 * @param {Object} constraints - Новые ограничения
 */
export const applyVideoConstraints = async (videoTrack, constraints) => {
  try {
    await videoTrack.applyConstraints(constraints);
  } catch (error) {
    console.error('Ошибка применения видеоограничений:', error);
    throw error;
  }
};

/**
 * Проверяет поддержку WebRTC в браузере
 * @returns {boolean} - true, если WebRTC поддерживается
 */
export const isWebRTCSupported = () => {
  return !!(navigator.mediaDevices && 
    navigator.mediaDevices.getUserMedia && 
    window.RTCPeerConnection);
}; 