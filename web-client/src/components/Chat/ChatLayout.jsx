import React, { useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, IconButton, useMediaQuery, useTheme, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import CallInterface from '../Calls/CallInterface';

// Ширина боковой панели
const drawerWidth = 320;

const ChatLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { activeConversation, callState } = useChat();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Обработчик перехода в админ-панель
  const goToAdminPanel = () => {
    navigate('/admin');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Верхняя панель */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {activeConversation ? 
              `Чат с ${activeConversation.name}` : 
              'Защищенный мессенджер'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Кнопка админ-панели для администраторов */}
            {currentUser && currentUser.role === 'admin' && (
              <Button
                color="inherit"
                startIcon={<AdminPanelSettingsIcon />}
                onClick={goToAdminPanel}
                sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
              >
                Админ-панель
              </Button>
            )}
            
            <IconButton color="inherit">
              <AccountCircle />
            </IconButton>
            <Typography variant="body1" sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}>
              {currentUser ? currentUser.username : ''}
            </Typography>
            <IconButton color="inherit" onClick={logout} aria-label="выйти">
              <ExitToAppIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Боковая панель со списком чатов */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Лучшая производительность на мобильных устройствах
          }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)'
            },
          }}
        >
          <ChatList onSelectChat={() => isMobile && setMobileOpen(false)} />
        </Drawer>
      </Box>
      
      {/* Основное содержимое */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Toolbar /> {/* Отступ для AppBar */}
        
        {/* Если есть активный звонок, показываем интерфейс звонка */}
        {callState.inCall && <CallInterface />}
        
        {/* Окно чата */}
        {!callState.inCall && (
          activeConversation ? 
            <ChatWindow /> : 
            <Box 
              sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.default',
                color: 'text.secondary'
              }}
            >
              <Typography variant="h6">
                Выберите чат для начала общения
              </Typography>
            </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatLayout;
