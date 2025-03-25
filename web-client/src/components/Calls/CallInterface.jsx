import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
  Avatar,
  Grid
} from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import PersonIcon from '@mui/icons-material/Person';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';

const CallInterface = () => {
  const { currentUser } = useAuth();
  const { activeConversation, callState, endCall } = useChat();
  
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  // Имитация настройки медиа-потока
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus('connected');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Обработчик завершения звонка
  const handleEndCall = () => {
    endCall();
  };
  
  // Обработчик включения/выключения микрофона
  const toggleMic = () => {
    setMicEnabled(!micEnabled);
    // Здесь должна быть логика включения/выключения микрофона в WebRTC
  };
  
  // Обработчик включения/выключения камеры
  const toggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
    // Здесь должна быть логика включения/выключения камеры в WebRTC
  };
  
  // Обработчик включения/выключения демонстрации экрана
  const toggleScreenShare = () => {
    setScreenShareEnabled(!screenShareEnabled);
    // Здесь должна быть логика включения/выключения демонстрации экрана в WebRTC
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'black' }}>
      {/* Основная область видео */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {callStatus === 'connecting' ? (
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <CircularProgress color="primary" size={60} />
            <Typography variant="h6" component="div" sx={{ mt: 2 }}>
              Подключение...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Видео собеседника (или заглушка) */}
            {cameraEnabled ? (
              <Box
                component="video"
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white' 
              }}>
                <Avatar sx={{ width: 120, height: 120, mb: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: 80 }} />
                </Avatar>
                <Typography variant="h5">
                  {activeConversation?.name || 'Собеседник'}
                </Typography>
              </Box>
            )}
            
            {/* Маленькое окно с собственным видео */}
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                width: 160,
                height: 90,
                bgcolor: 'black',
                overflow: 'hidden',
                borderRadius: 2,
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {cameraEnabled ? (
                <Box
                  component="video"
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%', 
                  color: 'white' 
                }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Box>
              )}
            </Paper>
          </>
        )}
      </Box>
      
      {/* Панель управления звонком */}
      <Paper 
        sx={{ 
          p: 2, 
          borderRadius: 0,
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'background.paper'
        }}
      >
        <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ maxWidth: 600 }}>
          <Grid item>
            <IconButton 
              onClick={toggleMic}
              color={micEnabled ? 'primary' : 'error'}
              sx={{ bgcolor: 'action.hover', p: 2 }}
            >
              {micEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </Grid>
          
          <Grid item>
            <IconButton 
              onClick={toggleCamera}
              color={cameraEnabled ? 'primary' : 'error'}
              sx={{ bgcolor: 'action.hover', p: 2 }}
            >
              {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Grid>
          
          <Grid item>
            <IconButton 
              onClick={toggleScreenShare}
              color={screenShareEnabled ? 'primary' : 'inherit'}
              sx={{ bgcolor: 'action.hover', p: 2 }}
            >
              {screenShareEnabled ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </Grid>
          
          <Grid item>
            <IconButton 
              onClick={handleEndCall}
              color="error"
              sx={{ bgcolor: 'error.main', p: 2, '&:hover': { bgcolor: 'error.dark' } }}
            >
              <CallEndIcon sx={{ color: 'white' }} />
            </IconButton>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default CallInterface;
