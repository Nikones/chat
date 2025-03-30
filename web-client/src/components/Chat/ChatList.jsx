import React, { useState, useEffect } from 'react';
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
  const [search, setSearch] = useState('');
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');

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
    if (!selectedUserId) {
      setError('Выберите пользователя для чата');
      return;
    }
    
    // Находим пользователя из списка
    const selectedUser = users.find(user => user.id.toString() === selectedUserId);
    if (!selectedUser) {
      setError('Выбранный пользователь не найден');
      return;
    }
    
    // Проверяем, существует ли уже такой чат
    const existingConversation = conversations.find(c => c.id === selectedUserId);
    
    if (existingConversation) {
      setActiveConversation(existingConversation);
    } else {
      // Создаем новый чат
      const newConversation = {
        id: selectedUserId,
        name: selectedUser.username,
        lastMessage: '',
        lastMessageTime: null
      };
      
      setActiveConversation(newConversation);
    }
    
    setNewChatDialogOpen(false);
    setSelectedUserId('');
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
    </>
  );
};

export default ChatList;
