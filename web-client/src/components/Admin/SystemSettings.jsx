import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCog, faServer, faUsers, faEnvelope, faFileUpload, faClock, faPhone, faUsersRectangle } from '@fortawesome/free-solid-svg-icons';
import { useAdmin } from '../../contexts/AdminContext';

const SystemSettings = () => {
  const { settings, loading, apiError, updateSettings, fetchSettings } = useAdmin();
  
  const [formData, setFormData] = useState({
    registrationEnabled: false,
    maxUploadSize: 10,
    messageRetentionDays: 30,
    callTimeout: 60,
    maxGroupSize: 20,
    maintenance_mode: false,
    app_name: 'Мессенджер',
    app_version: '0.0.0',
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (settings) {
      console.log("[SystemSettings] Обновление formData из settings:", settings);
      setFormData({
        registrationEnabled: settings.registration_enabled ?? settings.registrationEnabled ?? false,
        maxUploadSize: settings.maxUploadSize || 10,
        messageRetentionDays: settings.messageRetentionDays || 30,
        callTimeout: settings.callTimeout || 60,
        maxGroupSize: settings.maxGroupSize || 20,
        maintenance_mode: settings.maintenance_mode || false,
        app_name: settings.app_name || 'Мессенджер',
        app_version: settings.app_version || '0.0.0',
      });
    } else {
        fetchSettings();
    }
  }, [settings]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log(`[SystemSettings] Изменение поля: ${name}, Новое значение: ${type === 'checkbox' ? checked : value}`);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) || 0 : value)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const settingsDataToSend = {
          registration_enabled: formData.registrationEnabled,
          max_upload_size: formData.maxUploadSize,
          message_retention_days: formData.messageRetentionDays,
          call_timeout: formData.callTimeout,
          max_group_size: formData.maxGroupSize,
          maintenance_mode: formData.maintenance_mode,
      };

      console.log("[SystemSettings] Отправка данных настроек:", settingsDataToSend);
      const successFlag = await updateSettings(settingsDataToSend);

      if (successFlag) {
        setSuccess('Настройки системы успешно сохранены');
      } else {
        setError('Не удалось сохранить настройки. Проверьте консоль на наличие ошибок API.');
      }
    } catch (err) {
      setError('Ошибка при сохранении настроек: ' + (err.message || 'Неизвестная ошибка'));
      console.error('[SystemSettings] Ошибка при handleSubmit:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (loading.settings && !settings) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка настроек...</span>
        </Spinner>
      </div>
    );
  }
  
  if (apiError.settings) {
      return <Alert variant="danger">Ошибка загрузки настроек: {apiError.settings}</Alert>;
  }
  
  if (!settings) {
      return <Alert variant="warning">Настройки системы не загружены.</Alert>;
  }
  
  return (
    <div className="system-settings-container">
      <h3 className="mb-4">Настройки системы</h3>
      
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        {/* Общие настройки */}
        <Card className="mb-4">
          <Card.Header>
            <FontAwesomeIcon icon={faCog} className="me-2" />
            Общие настройки
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="registration-enabled"
                name="registrationEnabled"
                label="Регистрация пользователей разрешена"
                checked={formData.registrationEnabled}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Когда регистрация отключена, новые пользователи не могут создавать аккаунты.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Название приложения</Form.Label>
              <Form.Control
                type="text"
                name="app_name"
                value={formData.app_name}
                onChange={handleChange}
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Версия приложения</Form.Label>
              <Form.Control
                type="text"
                name="app_version"
                value={formData.app_version}
                onChange={handleChange}
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="maintenance_mode"
                name="maintenance_mode"
                label="Режим обслуживания"
                checked={formData.maintenance_mode}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                В режиме обслуживания пользователи (кроме админов) не смогут войти в систему.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>
        
        {/* Настройки Чата */}
        <Card className="mb-4">
          <Card.Header>
            <FontAwesomeIcon icon={faUsersRectangle} className="me-2" />
            Настройки Чата
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Максимальный размер загружаемых файлов (МБ)</Form.Label>
                  <Form.Control
                    type="number"
                    name="maxUploadSize"
                    value={formData.maxUploadSize}
                    onChange={handleChange}
                    min="1"
                    max="100"
                  />
                  <Form.Text className="text-muted">
                    Ограничение размера для одного файла в чате.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Время хранения сообщений (дней)</Form.Label>
                  <Form.Control
                    type="number"
                    name="messageRetentionDays"
                    value={formData.messageRetentionDays}
                    onChange={handleChange}
                    min="0"
                  />
                  <Form.Text className="text-muted">
                    Сообщения старше указанного срока будут удалены (0 - никогда).
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Максимальное время звонка (секунд)</Form.Label>
                  <Form.Control
                    type="number"
                    name="callTimeout"
                    value={formData.callTimeout}
                    onChange={handleChange}
                    min="10"
                    max="300"
                  />
                  <Form.Text className="text-muted">
                    Время ожидания ответа на звонок перед автоматическим сбросом.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Максимальный размер группы</Form.Label>
                  <Form.Control
                    type="number"
                    name="maxGroupSize"
                    value={formData.maxGroupSize}
                    onChange={handleChange}
                    min="2"
                    max="100"
                  />
                  <Form.Text className="text-muted">
                    Максимальное количество участников в одном групповом чате.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Кнопка Сохранить */}
        <div className="d-flex justify-content-end mt-3">
          <Button variant="primary" type="submit" disabled={isLoading}>
            <FontAwesomeIcon icon={faSave} className="me-2" />
            {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SystemSettings; 