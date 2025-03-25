import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Toolbar,
  IconButton,
  InputBase,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Divider
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import { useChat } from '../../contexts/ChatContext';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

// Стилизованный поиск
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

// Форматирование времени последнего сообщения
const formatTime = (timestamp) => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Вчера';
  } else {
    return format(date, 'd MMM', { locale: ru });
  }
};

const ChatList = ({ onSelectChat }) => {
  const { conversations, activeConversation, setActiveConversation } = useChat();
  const [search, setSearch] = useState('');
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');

  // Фильтрация чатов по поиску
  const filteredConversations = conversations.filter(conversation =>
    conversation.name.toLowerCase().includes(search.toLowerCase())
  );

  // Обработчик выбора чата
  const handleSelectChat = (conversation) => {
    setActiveConversation(conversation);
    if (onSelectChat) onSelectChat();
  };

  // Обработчик создания нового чата
  const handleCreateNewChat = () => {
    if (!newChatUserId) return;
    
    // Проверяем, существует ли уже такой чат
    const existingConversation = conversations.find(c => c.id === newChatUserId);
    
    if (existingConversation) {
      setActiveConversation(existingConversation);
    } else {
      // Создаем новый чат
      const newConversation = {
        id: newChatUserId,
        name: `Пользователь ${newChatUserId}`,
        lastMessage: '',
        lastMessageTime: null
      };
      
      setActiveConversation(newConversation);
    }
    
    setNewChatDialogOpen(false);
    setNewChatUserId('');
    if (onSelectChat) onSelectChat();
  };

  return (
    <>
      <Toolbar 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: [1],
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
        }}
      >
        <Typography variant="h6" component="div">
          Чаты
        </Typography>
        <IconButton 
          color="primary" 
          edge="end" 
          onClick={() => setNewChatDialogOpen(true)}
          aria-label="создать новый чат"
        >
          <AddIcon />
        </IconButton>
      </Toolbar>
      
      <Box sx={{ px: 2, py: 1 }}>
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Поиск…"
            inputProps={{ 'aria-label': 'поиск' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Search>
      </Box>
      
      <Divider />
      
      <List sx={{ overflow: 'auto', flexGrow: 1 }}>
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ListItem
              button
              key={conversation.id}
              selected={activeConversation && activeConversation.id === conversation.id}
              onClick={() => handleSelectChat(conversation)}
              sx={{
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(79, 158, 237, 0.15)',
                }
              }}
            >
              <ListItemAvatar>
                <Avatar>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={conversation.name}
                secondary={
                  conversation.lastMessage ? 
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{
                        display: 'inline',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180
                      }}
                    >
                      {conversation.lastMessage.length > 30
                        ? `${conversation.lastMessage.substring(0, 30)}...`
                        : conversation.lastMessage}
                    </Typography>
                    : 'Нет сообщений'
                }
              />
              {conversation.lastMessageTime && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {formatTime(conversation.lastMessageTime)}
                </Typography>
              )}
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText
              primary="Нет чатов"
              secondary={search ? "Попробуйте другой запрос" : "Начните новый чат"}
            />
          </ListItem>
        )}
      </List>
      
      {/* Диалог создания нового чата */}
      <Dialog 
        open={newChatDialogOpen} 
        onClose={() => setNewChatDialogOpen(false)}
        aria-labelledby="new-chat-dialog-title"
      >
        <DialogTitle id="new-chat-dialog-title">Новый чат</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="userId"
            label="ID пользователя"
            type="text"
            fullWidth
            variant="outlined"
            value={newChatUserId}
            onChange={(e) => setNewChatUserId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateNewChat} 
            color="primary"
            disabled={!newChatUserId}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatList;
