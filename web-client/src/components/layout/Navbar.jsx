import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Container, Nav, NavDropdown, Button, Badge, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faCog, 
  faSignOutAlt, 
  faShieldAlt, 
  faBell, 
  faEnvelope, 
  faInfoCircle,
  faHome
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png';
import './Navbar.css';

const Navbar = ({ toggleSidebar, isConnected, isAdmin }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]); // Для уведомлений
  
  // Определяем текущий раздел для активного меню
  const currentPath = location.pathname;
  const isAdminSection = currentPath.includes('/admin');
  const isProfileSection = currentPath.includes('/profile');
  const isSettingsSection = currentPath.includes('/settings');
  
  // Обработчик выхода из системы
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };
  
  return (
    <BootstrapNavbar bg="primary" variant="dark" expand="lg" fixed="top" className="app-navbar">
      <Container fluid>
        {/* Логотип и название */}
        <BootstrapNavbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img 
            src={logo} 
            alt="Логотип" 
            width="30" 
            height="30" 
            className="d-inline-block align-top me-2"
          />
          <span className="brand-text">Мессенджер Кикиты</span>
        </BootstrapNavbar.Brand>
        
        {/* Индикатор подключения */}
        <div className="connection-indicator-container d-none d-md-flex">
          {isConnected ? (
            <div className="connection-dot connected" title="Подключено"></div>
          ) : (
            <div className="connection-dot disconnected" title="Подключение...">
              <Spinner animation="border" size="sm" />
            </div>
          )}
        </div>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {isAuthenticated && (
              <>
                {/* Главная */}
                <Nav.Link 
                  as={Link} 
                  to="/" 
                  active={currentPath === '/'}
                  className="nav-link-icon"
                >
                  <FontAwesomeIcon icon={faHome} />
                  <span className="d-lg-none ms-2">Главная</span>
                </Nav.Link>
                
                {/* Уведомления */}
                <NavDropdown 
                  title={
                    <div className="nav-icon-container">
                      <FontAwesomeIcon icon={faBell} />
                      {notifications.length > 0 && (
                        <Badge pill bg="danger" className="notification-badge">
                          {notifications.length}
                        </Badge>
                      )}
                    </div>
                  } 
                  id="notifications-dropdown"
                  align="end"
                >
                  {notifications.length === 0 ? (
                    <NavDropdown.Item disabled>Нет новых уведомлений</NavDropdown.Item>
                  ) : (
                    notifications.map((notification, index) => (
                      <NavDropdown.Item key={index}>
                        {notification.message}
                      </NavDropdown.Item>
                    ))
                  )}
                </NavDropdown>
                
                {/* Админ-панель (только для администраторов) */}
                {isAdmin && (
                  <Nav.Link 
                    as={Link} 
                    to="/admin" 
                    active={isAdminSection}
                    className="nav-link-icon"
                  >
                    <FontAwesomeIcon icon={faShieldAlt} />
                    <span className="d-lg-none ms-2">Админ панель</span>
                  </Nav.Link>
                )}
                
                {/* Пользовательское меню */}
                <NavDropdown 
                  title={
                    <div className="user-menu-toggle">
                      <div className="user-avatar">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="Аватар" className="avatar-img" />
                        ) : (
                          <span className="avatar-placeholder">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <span className="d-none d-lg-inline ms-2">{user?.username || 'Пользователь'}</span>
                    </div>
                  } 
                  id="user-dropdown"
                  align="end"
                >
                  <div className="dropdown-user-info">
                    <div className="dropdown-user-name">{user?.username || 'Пользователь'}</div>
                    <div className="dropdown-user-email">{user?.email || 'Нет email'}</div>
                  </div>
                  
                  <NavDropdown.Divider />
                  
                  <NavDropdown.Item as={Link} to="/profile" active={isProfileSection}>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Профиль
                  </NavDropdown.Item>
                  
                  <NavDropdown.Item as={Link} to="/settings" active={isSettingsSection}>
                    <FontAwesomeIcon icon={faCog} className="me-2" />
                    Настройки
                  </NavDropdown.Item>
                  
                  <NavDropdown.Divider />
                  
                  <NavDropdown.Item onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                    Выход
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar; 