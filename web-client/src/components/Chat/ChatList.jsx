import React, { useState, useEffect, useCallback } from 'react';
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
  Box,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import authApi from '../../api/auth';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useMessages } from '../../contexts/MessageContext';

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
  const { token, currentUser } = useAuth();
  const { 
    chats: messageChats, 
    activeChat, 
    setActiveConversation: setActiveMessageConversation, 
    loadChats, 
    createChat 
  } = useMessages();
  const [search, setSearch] = useState('');
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const { isConnected } = useWebSocket();

  // Загрузка списка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      
      try {
        setLoadingUsers(true);
        setError('');
        // Используем getChatUsers вместо getUsers для обычных пользователей
        // Если пользователь админ, используем getUsers для полного списка
        let usersList = [];
        
        if (currentUser.role === 'admin') {
          // Админу доступен полный список с ролями
          usersList = await authApi.getUsers(token);
        } else {
          // Обычному пользователю доступен только список для чатов
          usersList = await authApi.getChatUsers(token);
        }

        // Отфильтруем текущего пользователя из списка (хотя бэкенд это уже делает)
        const filteredUsers = usersList.filter(user => user.id !== currentUser.id);
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Ошибка при загрузке пользователей:', err);
        setError('Не удалось загрузить список пользователей');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [token, currentUser]);

  // Фильтрация чатов по поиску
  const filteredConversations = messageChats.filter(conversation =>
    conversation.name.toLowerCase().includes(search.toLowerCase())
  );

  // Обработчик выбора чата
  const handleSelectChat = (conversation) => {
    setActiveMessageConversation(conversation.id);
    if (onSelectChat) onSelectChat();
  };

  // Обработчик создания нового чата из диалога
  const handleCreateNewChat = async () => {
    if (!selectedUserId) {
      setError('Выберите пользователя для чата');
      return;
    }
    setError('');

    const userIdNumber = parseInt(selectedUserId);
    if (isNaN(userIdNumber)) {
        setError('Некорректный ID пользователя');
        return;
    }

    // Проверяем существующий чат в messageChats
    const existingConversation = messageChats.find(c => 
        c.type === 'direct' && 
        c.users?.some(u => u.id === userIdNumber) &&
        c.users?.some(u => u.id === currentUser.id)
    );

    if (existingConversation) {
      console.log('ChatList: Чат с этим пользователем уже существует, делаем активным');
      setActiveMessageConversation(existingConversation.id);
      setNewChatDialogOpen(false);
      setSelectedUserId('');
      if (onSelectChat) onSelectChat();
      return;
    }

    console.log(`ChatList: Попытка создать личный чат с пользователем ID: ${userIdNumber}`);
    try {
      // Добавляем лог перед вызовом
      console.log(`ChatList: Вызываем createChat из MessageContext с параметрами:`, { type: 'direct', user_ids: [userIdNumber] });
      
      // Вызываем createChat из useMessages
      const newChat = await createChat({ type: 'direct', user_ids: [userIdNumber] });
      if (newChat) {
        console.log('ChatList: Чат успешно создан через контекст', newChat);
        setNewChatDialogOpen(false);
        setSelectedUserId('');
        if (onSelectChat) onSelectChat();
      } else {
        // Ошибка отобразится через toast из контекста
        setError('Не удалось создать чат. Попробуйте снова.'); 
      }
    } catch (err) {
       // Ошибка уже обработана в контексте
       console.error("ChatList: Ошибка при вызове createChat", err);
       setError('Ошибка при создании чата.');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Чаты</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box 
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: isConnected ? 'success.main' : 'error.main',
              mr: 1
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {isConnected ? 'Подключено' : 'Отключено'}
          </Typography>
          <IconButton size="small" onClick={() => setNewChatDialogOpen(true)}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>
      
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
              selected={activeChat && activeChat.id === conversation.id}
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
                secondaryTypographyProps={{
                  sx: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }
                }}
              />
              {conversation.lastMessageTime && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {formatTime(conversation.lastMessageTime)}
                </Typography>
              )}
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText 
              primary={
                <Typography align="center" color="text.secondary">
                  {search ? 'Нет результатов поиска' : 'Нет активных чатов'}
                </Typography>
              }
              secondary={
                search ? null : (
                  <Typography align="center" variant="caption" color="text.secondary">
                    Нажмите + чтобы начать новый чат
                  </Typography>
                )
              }
            />
          </ListItem>
        )}
      </List>

      {/* Диалог создания нового чата */}
      <Dialog open={newChatDialogOpen} onClose={() => setNewChatDialogOpen(false)}>
        <DialogTitle>Создать новый чат</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="user-select-label">Выберите пользователя</InputLabel>
              <Select
                labelId="user-select-label"
                id="user-select"
                value={selectedUserId}
                label="Выберите пользователя"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.length > 0 ? (
                  users.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      {user.username}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Нет доступных пользователей</MenuItem>
                )}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateNewChat} 
            variant="contained" 
            disabled={!selectedUserId || loadingUsers}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatList;
