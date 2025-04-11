import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useMessage } from './MessageContext';
import {
  createPeerConnection,
  getLocalMedia,
  addLocalTracks,
  createOffer,
  createAnswer,
  handleAnswer,
  addIceCandidate,
  closeConnection
} from '../utils/webrtc';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { activeChat } = useMessage();
  
  // Состояние звонка
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, connected, ended
  
  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnection) {
        closeConnection(peerConnection, localStream);
      }
    };
  }, [localStream, peerConnection]);
  
  // Обработчик ICE кандидатов
  const handleIceCandidate = useCallback((candidate) => {
    if (!candidate || !currentCall) return;
    
    // Отправляем ICE кандидата через WebSocket
    // TODO: Отправить ICE кандидата через WebSocket
    console.log('Отправляем ICE кандидата:', candidate);
  }, [currentCall]);
  
  // Обработчик входящих медиа-треков
  const handleTrack = useCallback((stream) => {
    console.log('Получен удаленный медиа-поток:', stream);
    setRemoteStream(stream);
  }, []);
  
  // Инициирование звонка
  const initiateCall = async (chatId, withVideo = true) => {
    if (!isAuthenticated || !chatId) return;
    
    try {
      // Создаем соединение
      const pc = createPeerConnection(handleIceCandidate, handleTrack);
      setPeerConnection(pc);
      
      // Получаем локальный медиа-поток
      const stream = await getLocalMedia(true, withVideo);
      setLocalStream(stream);
      
      // Добавляем треки в соединение
      addLocalTracks(pc, stream);
      
      // Создаем предложение SDP
      const offer = await createOffer(pc);
      
      // Устанавливаем статус звонка
      setCallStatus('calling');
      
      // Устанавливаем текущий звонок
      setCurrentCall({
        chatId,
        recipientId: activeChat?.userId, // предполагается, что это ID собеседника
        withVideo,
        offer,
        timestamp: new Date()
      });
      
      // Отправляем предложение через WebSocket
      // TODO: Отправить предложение через WebSocket
      console.log('Отправляем предложение звонка:', offer);
      
      return true;
    } catch (error) {
      console.error('Ошибка инициирования звонка:', error);
      cleanupCall();
      return false;
    }
  };
  
  // Обработка входящего звонка
  const handleIncomingCall = useCallback((callData) => {
    console.log('Входящий звонок:', callData);
    setIncomingCall(callData);
    setCallStatus('ringing');
  }, []);
  
  // Принятие входящего звонка
  const acceptCall = async () => {
    if (!incomingCall) return false;
    
    try {
      // Создаем соединение
      const pc = createPeerConnection(handleIceCandidate, handleTrack);
      setPeerConnection(pc);
      
      // Получаем локальный медиа-поток
      const stream = await getLocalMedia(true, incomingCall.withVideo);
      setLocalStream(stream);
      
      // Добавляем треки в соединение
      addLocalTracks(pc, stream);
      
      // Создаем ответ SDP
      const answer = await createAnswer(pc, incomingCall.offer);
      
      // Устанавливаем статус звонка
      setCallStatus('connected');
      
      // Устанавливаем текущий звонок и очищаем входящий
      setCurrentCall(incomingCall);
      setIncomingCall(null);
      
      // Отправляем ответ через WebSocket
      // TODO: Отправить ответ через WebSocket
      console.log('Отправляем ответ на звонок:', answer);
      
      return true;
    } catch (error) {
      console.error('Ошибка принятия звонка:', error);
      cleanupCall();
      return false;
    }
  };
  
  // Отклонение входящего звонка
  const rejectCall = () => {
    if (!incomingCall) return;
    
    // Отправляем отказ через WebSocket
    // TODO: Отправить отказ через WebSocket
    console.log('Отклоняем звонок');
    
    // Очищаем состояние
    setIncomingCall(null);
    setCallStatus('idle');
  };
  
  // Обработка ответа на звонок
  const handleCallAnswer = useCallback(async (answer) => {
    if (!peerConnection || !currentCall) return;
    
    try {
      await handleAnswer(peerConnection, answer);
      setCallStatus('connected');
    } catch (error) {
      console.error('Ошибка обработки ответа на звонок:', error);
      cleanupCall();
    }
  }, [peerConnection, currentCall]);
  
  // Обработка отказа от звонка
  const handleCallRejected = useCallback(() => {
    console.log('Звонок отклонен');
    cleanupCall();
  }, []);
  
  // Обработка полученного ICE кандидата
  const handleRemoteIceCandidate = useCallback((candidate) => {
    if (!peerConnection) return;
    
    try {
      addIceCandidate(peerConnection, candidate);
    } catch (error) {
      console.error('Ошибка добавления ICE кандидата:', error);
    }
  }, [peerConnection]);
  
  // Завершение звонка
  const endCall = () => {
    if (!currentCall) return;
    
    // Отправляем уведомление о завершении звонка через WebSocket
    // TODO: Отправить уведомление о завершении через WebSocket
    console.log('Завершаем звонок');
    
    cleanupCall();
  };
  
  // Очистка ресурсов звонка
  const cleanupCall = () => {
    if (peerConnection) {
      closeConnection(peerConnection, localStream);
      setPeerConnection(null);
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setCurrentCall(null);
    setIncomingCall(null);
    setCallStatus('idle');
  };
  
  // Переключение камеры
  const toggleCamera = () => {
    if (!localStream) return false;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return true;
    }
    
    return false;
  };
  
  // Переключение микрофона
  const toggleMicrophone = () => {
    if (!localStream) return false;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return true;
    }
    
    return false;
  };
  
  const value = {
    incomingCall,
    currentCall,
    localStream,
    remoteStream,
    callStatus,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleCamera,
    toggleMicrophone,
    handleIncomingCall,
    handleCallAnswer,
    handleCallRejected,
    handleRemoteIceCandidate
  };
  
  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}; 