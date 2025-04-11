import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import CallOverlay from '../Chat/CallOverlay';
import { useCall } from '../../contexts/CallContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const { activeCall } = useCall();
  const { isConnected } = useWebSocket();
  const { user } = useAuth();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  
  // Определяем, находимся ли мы на странице админ-панели
  const isAdminPanel = location.pathname.includes('/admin');
  
  // Переключение отображения боковой панели на мобильных устройствах
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  return (
    <div className={`app-layout ${isAdminPanel ? 'admin-layout' : ''}`}>
      {/* Верхняя навигационная панель */}
      <Navbar 
        toggleSidebar={toggleSidebar} 
        isConnected={isConnected}
        isAdmin={user?.role === 'admin'}
      />
      
      <div className="d-md-none mobile-sidebar-toggle">
        <Button 
          variant="primary" 
          className="toggle-btn" 
          onClick={toggleSidebar}
          aria-label={showSidebar ? "Скрыть меню" : "Показать меню"}
        >
          <FontAwesomeIcon icon={showSidebar ? faTimes : faBars} />
        </Button>
      </div>
      
      <Container fluid className="main-container">
        <Row className="h-100">
          {/* Боковая панель - показывается всегда на десктопе и по условию на мобильных */}
          <Col 
            md={3} 
            lg={2} 
            className={`sidebar-container ${showSidebar ? 'd-block' : 'd-none d-md-block'}`}
          >
            <Sidebar />
          </Col>
          
          {/* Основное содержимое - адаптируется в зависимости от наличия боковой панели */}
          <Col 
            xs={12} 
            md={showSidebar ? 9 : 12} 
            lg={showSidebar ? 10 : 12} 
            className="content-container"
          >
            {/* Индикатор соединения */}
            {!isConnected && (
              <div className="connection-status">
                <div className="connection-indicator offline"></div>
                <span>Нет соединения с сервером</span>
              </div>
            )}
            
            {/* Основное содержимое */}
            <Outlet />
          </Col>
        </Row>
      </Container>
      
      {/* Подвал сайта - только для админ панели */}
      {isAdminPanel && <Footer />}
      
      {/* Оверлей для звонков */}
      {activeCall && <CallOverlay />}
      
      {/* Мобильная затемняющая подложка при открытом сайдбаре */}
      {showSidebar && (
        <div 
          className="sidebar-backdrop d-md-none" 
          onClick={toggleSidebar}
          aria-hidden="true"
        ></div>
      )}
    </div>
  );
};

export default Layout; 