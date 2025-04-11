/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPhone, faPhoneSlash, faMicrophone, faMicrophoneSlash,
  faVideo, faVideoSlash, faArrowsAlt
} from '@fortawesome/free-solid-svg-icons';
import { useCall } from '../../contexts/CallContext';
import './CallOverlay.css';

const CallOverlay = () => {
  const { 
    activeCall, 
    remoteStream, 
    localStream, 
    endCall, 
    acceptCall, 
    rejectCall,
    toggleMicrophone,
    toggleCamera,
    isMicrophoneEnabled,
    isCameraEnabled
  } = useCall();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [durationTimer, setDurationTimer] = useState(null);
  
  // Преобразование секунд в формат MM:SS
  const formatDuration = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  // Переключение полноэкранного режима
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);
  
  // Получение имени собеседника
  const getCallerName = useCallback(() => {
    return activeCall?.recipientName || 'Пользователь';
  }, [activeCall]);
  
  // Переключение в полноэкранный режим
  const handleFullscreen = useCallback((element) => {
    if (element) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    }
  }, []);
  
  // Запуск таймера продолжительности звонка
  useEffect(() => {
    let timer = null;
    
    // Проверяем наличие активного звонка внутри хука
    if (activeCall && activeCall.status === 'connected' && !durationTimer) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setDurationTimer(timer);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (durationTimer) {
        clearInterval(durationTimer);
        setDurationTimer(null);
        setCallDuration(0);
      }
    };
  }, [activeCall, durationTimer]);
  
  // Выполняем рендеринг компонента только если есть активный звонок
  // ВАЖНО: Это должно быть после всех вызовов хуков!
  if (!activeCall) {
    return null;
  }
  
  // Рендеринг компонента
  return (
    <div className={`call-overlay ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="call-container">
        {/* Видео собеседника */}
        {activeCall.isVideo && remoteStream && (
          <div className="remote-video-container" onClick={() => handleFullscreen(document.querySelector('.remote-video-container'))}>
            <video 
              ref={(videoElement) => {
                if (videoElement && remoteStream) {
                  videoElement.srcObject = remoteStream;
                }
              }} 
              autoPlay 
              playsInline
              className="remote-video"
            />
          </div>
        )}
        
        {/* Локальное видео */}
        {activeCall.isVideo && localStream && (
          <div className="local-video-container">
            <video 
              ref={(videoElement) => {
                if (videoElement && localStream) {
                  videoElement.srcObject = localStream;
                }
              }} 
              autoPlay 
              playsInline
              muted
              className="local-video"
            />
          </div>
        )}
        
        {/* Информация о звонке */}
        <div className="call-info">
          <div className="caller-avatar">
            {activeCall.recipientAvatar ? (
              <img src={activeCall.recipientAvatar} alt={getCallerName()} />
            ) : (
              <div className="caller-avatar-placeholder">
                {getCallerName().charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="caller-name">{getCallerName()}</div>
          
          <div className="call-status">
            {activeCall.status === 'ringing' && activeCall.isIncoming && 'Входящий звонок...'}
            {activeCall.status === 'ringing' && !activeCall.isIncoming && 'Вызов...'}
            {activeCall.status === 'connected' && formatDuration(callDuration)}
            {activeCall.status === 'ended' && 'Звонок завершен'}
          </div>
        </div>
        
        {/* Кнопки управления звонком */}
        <div className="call-controls">
          {activeCall.status === 'ringing' && activeCall.isIncoming ? (
            // Кнопки для входящего звонка
            <>
              <Button 
                variant="success" 
                className="call-control-btn accept-btn"
                onClick={acceptCall}
              >
                <FontAwesomeIcon icon={faPhone} />
              </Button>
              
              <Button 
                variant="danger" 
                className="call-control-btn reject-btn"
                onClick={rejectCall}
              >
                <FontAwesomeIcon icon={faPhoneSlash} />
              </Button>
            </>
          ) : (
            // Кнопки для исходящего/активного звонка
            <>
              <Button 
                variant={isMicrophoneEnabled ? 'light' : 'secondary'} 
                className="call-control-btn"
                onClick={toggleMicrophone}
              >
                <FontAwesomeIcon icon={isMicrophoneEnabled ? faMicrophone : faMicrophoneSlash} />
              </Button>
              
              {activeCall.isVideo && (
                <Button 
                  variant={isCameraEnabled ? 'light' : 'secondary'} 
                  className="call-control-btn"
                  onClick={toggleCamera}
                >
                  <FontAwesomeIcon icon={isCameraEnabled ? faVideo : faVideoSlash} />
                </Button>
              )}
              
              <Button 
                variant="danger" 
                className="call-control-btn end-btn"
                onClick={endCall}
              >
                <FontAwesomeIcon icon={faPhoneSlash} />
              </Button>
              
              {activeCall.isVideo && (
                <Button 
                  variant="light" 
                  className="call-control-btn"
                  onClick={toggleFullscreen}
                >
                  <FontAwesomeIcon icon={faArrowsAlt} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay; 