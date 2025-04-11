import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Nav } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { user, updatePassword, updateSettings } = useAuth();
  
  // Состояние для смены пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Состояние для настроек приложения
  const [notificationSound, setNotificationSound] = useState(true);
  const [darkTheme, setDarkTheme] = useState(false);
  const [messagePreview, setMessagePreview] = useState(true);
  const [autoDownload, setAutoDownload] = useState(true);
  const [language, setLanguage] = useState('ru');
  
  // Состояние для управления формой
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Загрузка текущих настроек
  useEffect(() => {
    if (user?.settings) {
      const settings = user.settings;
      setNotificationSound(settings.notification_sound ?? true);
      setDarkTheme(settings.dark_theme ?? false);
      setMessagePreview(settings.message_preview ?? true);
      setAutoDownload(settings.auto_download ?? true);
      setLanguage(settings.language ?? 'ru');
      
      // Применение темной темы, если настройка включена
      if (settings.dark_theme) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }, [user]);
  
  // Обработчик смены пароля
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Валидация формы
    if (newPassword !== confirmPassword) {
      return setError('Новые пароли не совпадают');
    }
    
    if (newPassword.length < 6) {
      return setError('Новый пароль должен содержать минимум 6 символов');
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await updatePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      
      setSuccess('Пароль успешно изменен');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Ошибка при изменении пароля');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик сохранения настроек
  const handleSettingsSave = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const settings = {
        notification_sound: notificationSound,
        dark_theme: darkTheme,
        message_preview: messagePreview,
        auto_download: autoDownload,
        language: language
      };
      
      await updateSettings(settings);
      
      // Применение темной темы
      if (darkTheme) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      
      setSuccess('Настройки успешно сохранены');
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении настроек');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <Card>
            <Card.Header>
              <h4 className="mb-0">Настройки</h4>
            </Card.Header>
            <Card.Body>
              <Tab.Container id="settings-tabs" defaultActiveKey="general">
                <Row>
                  <Col sm={3}>
                    <Nav variant="pills" className="flex-column mb-3">
                      <Nav.Item>
                        <Nav.Link eventKey="general">Общие</Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="security">Безопасность</Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="notifications">Уведомления</Nav.Link>
                      </Nav.Item>
                    </Nav>
                  </Col>
                  <Col sm={9}>
                    <Tab.Content>
                      {/* Общие настройки */}
                      <Tab.Pane eventKey="general">
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}
                        
                        <Form onSubmit={handleSettingsSave}>
                          <Form.Group className="mb-3">
                            <Form.Label>Язык интерфейса</Form.Label>
                            <Form.Select 
                              value={language} 
                              onChange={(e) => setLanguage(e.target.value)}
                            >
                              <option value="ru">Русский</option>
                              <option value="en">English</option>
                            </Form.Select>
                          </Form.Group>
                          
                          <Form.Group className="mb-3">
                            <Form.Check 
                              type="switch"
                              id="dark-theme"
                              label="Темная тема"
                              checked={darkTheme}
                              onChange={(e) => setDarkTheme(e.target.checked)}
                            />
                          </Form.Group>
                          
                          <Form.Group className="mb-3">
                            <Form.Check 
                              type="switch"
                              id="message-preview"
                              label="Предпросмотр сообщений в уведомлениях"
                              checked={messagePreview}
                              onChange={(e) => setMessagePreview(e.target.checked)}
                            />
                          </Form.Group>
                          
                          <Form.Group className="mb-3">
                            <Form.Check 
                              type="switch"
                              id="auto-download"
                              label="Автоматически загружать медиафайлы"
                              checked={autoDownload}
                              onChange={(e) => setAutoDownload(e.target.checked)}
                            />
                          </Form.Group>
                          
                          <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={loading}
                          >
                            {loading ? 'Сохранение...' : 'Сохранить настройки'}
                          </Button>
                        </Form>
                      </Tab.Pane>
                      
                      {/* Настройки безопасности */}
                      <Tab.Pane eventKey="security">
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}
                        
                        <h5 className="mb-3">Изменение пароля</h5>
                        <Form onSubmit={handlePasswordChange}>
                          <Form.Group className="mb-3" controlId="currentPassword">
                            <Form.Label>Текущий пароль</Form.Label>
                            <Form.Control 
                              type="password" 
                              value={currentPassword} 
                              onChange={(e) => setCurrentPassword(e.target.value)} 
                              required
                            />
                          </Form.Group>
                          
                          <Form.Group className="mb-3" controlId="newPassword">
                            <Form.Label>Новый пароль</Form.Label>
                            <Form.Control 
                              type="password" 
                              value={newPassword} 
                              onChange={(e) => setNewPassword(e.target.value)} 
                              required
                              minLength={6}
                            />
                          </Form.Group>
                          
                          <Form.Group className="mb-3" controlId="confirmPassword">
                            <Form.Label>Подтверждение нового пароля</Form.Label>
                            <Form.Control 
                              type="password" 
                              value={confirmPassword} 
                              onChange={(e) => setConfirmPassword(e.target.value)} 
                              required
                              minLength={6}
                            />
                          </Form.Group>
                          
                          <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={loading}
                          >
                            {loading ? 'Изменение...' : 'Изменить пароль'}
                          </Button>
                        </Form>
                      </Tab.Pane>
                      
                      {/* Настройки уведомлений */}
                      <Tab.Pane eventKey="notifications">
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}
                        
                        <Form onSubmit={handleSettingsSave}>
                          <Form.Group className="mb-3">
                            <Form.Check 
                              type="switch"
                              id="notification-sound"
                              label="Звук уведомлений"
                              checked={notificationSound}
                              onChange={(e) => setNotificationSound(e.target.checked)}
                            />
                          </Form.Group>
                          
                          <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={loading}
                          >
                            {loading ? 'Сохранение...' : 'Сохранить настройки'}
                          </Button>
                        </Form>
                      </Tab.Pane>
                    </Tab.Content>
                  </Col>
                </Row>
              </Tab.Container>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings; 