import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  Tooltip,
  CircularProgress,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import PersonIcon from '@mui/icons-material/Person';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageItem from './MessageItem';

// Стилизованный компонент для области сообщений
const MessageArea = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column-reverse', // Чтобы прокрутка начиналась снизу
  backgroundColor: theme.palette.background.default,
}));

const ChatWindow = () => {
  const { currentUser } = useAuth();
  const { activeConversation, messages, sendMessage, initiateCall } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messageAreaRef = useRef(null);
  const inputRef = useRef(null);

  // Получаем сообщения для активного разговора
  const conversationMessages = messages[activeConversation?.id] || [];

  // Прокручиваем к последнему сообщению при загрузке или получении новых сообщений
  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = 0;
    }
  }, [conversationMessages.length]);

  // Обработчик отправки сообщения
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;
    
    setSending(true);
    try {
      await sendMessage(activeConversation.id, newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    } finally {
      setSending(false);
    }
  };

  // Обработчик инициирования аудио звонка
  const handleAudioCall = () => {
    initiateCall(activeConversation.id, false);
  };

  // Обработчик инициирования видео звонка
  const handleVideoCall = () => {
    initiateCall(activeConversation.id, true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Шапка чата */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="h6">
            {activeConversation?.name || 'Чат'}
          </Typography>
        </Box>
        
        <Box>
          <Tooltip title="Аудио звонок">
            <IconButton onClick={handleAudioCall} color="primary">
              <CallIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Видео звонок">
            <IconButton onClick={handleVideoCall} color="primary">
              <VideocamIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      <Divider />
      
      {/* Область сообщений */}
      <MessageArea ref={messageAreaRef}>
        {conversationMessages.length > 0 ? (
          // Показываем сообщения в обратном порядке, чтобы последние были внизу
          [...conversationMessages].reverse().map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOutgoing={message.sender_id === currentUser?.id}
            />
          ))
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <Typography variant="body1">
              Начните общение прямо сейчас
            </Typography>
          </Box>
        )}
      </MessageArea>
      
      {/* Форма отправки сообщения */}
      <Paper 
        component="form"
        onSubmit={handleSendMessage}
        sx={{ 
          p: '2px 4px', 
          display: 'flex', 
          alignItems: 'center',
          borderRadius: 0,
          borderTop: '1px solid rgba(0, 0, 0, 0.12)'
        }}
      >
        <IconButton 
          sx={{ p: '10px' }} 
          aria-label="эмодзи"
        >
          <EmojiEmotionsIcon />
        </IconButton>
        <IconButton 
          sx={{ p: '10px' }} 
          aria-label="прикрепить файл"
        >
          <AttachFileIcon />
        </IconButton>
        
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Написать сообщение..."
          variant="standard"
          InputProps={{ disableUnderline: true }}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={sending}
          inputRef={inputRef}
          sx={{ ml: 1, flex: 1 }}
        />
        
        <IconButton 
          color="primary" 
          sx={{ p: '10px' }} 
          aria-label="отправить"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          type="submit"
        >
          {sending ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Paper>
    </Box>
  );
};

export default ChatWindow;
