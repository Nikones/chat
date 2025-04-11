import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCog, faServer, faUsers, faEnvelope, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { useAdmin } from '../../contexts/AdminContext';

const SystemSettings = () => {
  const { systemSettings, loading, error: adminError, loadSystemSettings, updateSettings } = useAdmin();
  
  const [formData, setFormData] = useState({
    max_file_size: 20,
    max_users: 1000,
    enable_registration: true,
    registration_requires_approval: false,
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    storage_type: 'local',
    storage_path: './uploads',
    s3_bucket: '',
    s3_region: '',
    s3_access_key: '',
    s3_secret_key: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Загрузка системных настроек
  useEffect(() => {
    if (systemSettings) {
      setFormData({
        max_file_size: systemSettings.max_file_size || 20,
        max_users: systemSettings.max_users || 1000,
        enable_registration: systemSettings.enable_registration !== false,
        registration_requires_approval: systemSettings.registration_requires_approval === true,
        smtp_enabled: systemSettings.smtp_enabled === true,
        smtp_host: systemSettings.smtp_host || '',
        smtp_port: systemSettings.smtp_port || 587,
        smtp_user: systemSettings.smtp_user || '',
        smtp_password: systemSettings.smtp_password || '',
        smtp_from: systemSettings.smtp_from || '',
        storage_type: systemSettings.storage_type || 'local',
        storage_path: systemSettings.storage_path || './uploads',
        s3_bucket: systemSettings.s3_bucket || '',
        s3_region: systemSettings.s3_region || '',
        s3_access_key: systemSettings.s3_access_key || '',
        s3_secret_key: systemSettings.s3_secret_key || ''
      });
    }
  }, [systemSettings]);
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Сохранение настроек
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Сбрасываем статусы и ошибки
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      // Преобразуем числовые значения
      const settingsData = {
        ...formData,
        max_file_size: parseInt(formData.max_file_size, 10),
        max_users: parseInt(formData.max_users, 10),
        smtp_port: parseInt(formData.smtp_port, 10)
      };
      
      // Отправляем запрос через контекст
      const result = await updateSettings(settingsData);
      
      if (result.success) {
        setSuccess('Настройки системы успешно сохранены');
        // Перезагружаем настройки
        loadSystemSettings();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Ошибка при сохранении настроек: ' + (error.message || 'Неизвестная ошибка'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (loading && !systemSettings) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </Spinner>
      </div>
    );
  }
  
  return (
    <div className="system-settings-container">
      <h3 className="mb-4">Настройки системы</h3>
      
      {(error || adminError) && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error || adminError}
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
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Максимальный размер файла (МБ)</Form.Label>
                  <Form.Control
                    type="number"
                    name="max_file_size"
                    value={formData.max_file_size}
                    onChange={handleChange}
                    min="1"
                    max="100"
                  />
                  <Form.Text className="text-muted">
                    Максимальный размер файла, который можно загрузить в систему
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Максимальное количество пользователей</Form.Label>
                  <Form.Control
                    type="number"
                    name="max_users"
                    value={formData.max_users}
                    onChange={handleChange}
                    min="1"
                  />
                  <Form.Text className="text-muted">
                    Ограничение на количество пользователей в системе (0 - без ограничений)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Настройки регистрации */}
        <Card className="mb-4">
          <Card.Header>
            <FontAwesomeIcon icon={faUsers} className="me-2" />
            Настройки регистрации
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="enable_registration"
                    name="enable_registration"
                    label="Разрешить регистрацию новых пользователей"
                    checked={formData.enable_registration}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted">
                    Если отключено, только администраторы смогут создавать новых пользователей
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="registration_requires_approval"
                    name="registration_requires_approval"
                    label="Требовать подтверждение администратором"
                    checked={formData.registration_requires_approval}
                    onChange={handleChange}
                    disabled={!formData.enable_registration}
                  />
                  <Form.Text className="text-muted">
                    Если включено, новые пользователи будут неактивны до одобрения администратором
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Настройки SMTP */}
        <Card className="mb-4">
          <Card.Header>
            <FontAwesomeIcon icon={faEnvelope} className="me-2" />
            Настройки SMTP (Email)
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="smtp_enabled"
                name="smtp_enabled"
                label="Включить отправку email"
                checked={formData.smtp_enabled}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Используется для отправки уведомлений и подтверждений регистрации
              </Form.Text>
            </Form.Group>
            
            {formData.smtp_enabled && (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Сервер</Form.Label>
                      <Form.Control
                        type="text"
                        name="smtp_host"
                        value={formData.smtp_host}
                        onChange={handleChange}
                        placeholder="smtp.example.com"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Порт</Form.Label>
                      <Form.Control
                        type="number"
                        name="smtp_port"
                        value={formData.smtp_port}
                        onChange={handleChange}
                        placeholder="587"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Пользователь</Form.Label>
                      <Form.Control
                        type="text"
                        name="smtp_user"
                        value={formData.smtp_user}
                        onChange={handleChange}
                        placeholder="user@example.com"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Пароль</Form.Label>
                      <Form.Control
                        type="password"
                        name="smtp_password"
                        value={formData.smtp_password}
                        onChange={handleChange}
                        placeholder="Пароль"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Email отправителя</Form.Label>
                  <Form.Control
                    type="email"
                    name="smtp_from"
                    value={formData.smtp_from}
                    onChange={handleChange}
                    placeholder="noreply@example.com"
                  />
                  <Form.Text className="text-muted">
                    Адрес, от имени которого будут отправляться письма
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Card.Body>
        </Card>
        
        {/* Настройки хранилища файлов */}
        <Card className="mb-4">
          <Card.Header>
            <FontAwesomeIcon icon={faFileUpload} className="me-2" />
            Настройки хранилища файлов
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Тип хранилища</Form.Label>
              <Form.Select
                name="storage_type"
                value={formData.storage_type}
                onChange={handleChange}
              >
                <option value="local">Локальное хранилище</option>
                <option value="s3">Amazon S3 / MinIO</option>
              </Form.Select>
            </Form.Group>
            
            {formData.storage_type === 'local' ? (
              <Form.Group className="mb-3">
                <Form.Label>Путь к хранилищу файлов</Form.Label>
                <Form.Control
                  type="text"
                  name="storage_path"
                  value={formData.storage_path}
                  onChange={handleChange}
                  placeholder="./uploads"
                />
                <Form.Text className="text-muted">
                  Относительный или абсолютный путь к директории для хранения файлов
                </Form.Text>
              </Form.Group>
            ) : (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>S3 Bucket</Form.Label>
                      <Form.Control
                        type="text"
                        name="s3_bucket"
                        value={formData.s3_bucket}
                        onChange={handleChange}
                        placeholder="my-bucket"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>S3 Region</Form.Label>
                      <Form.Control
                        type="text"
                        name="s3_region"
                        value={formData.s3_region}
                        onChange={handleChange}
                        placeholder="us-east-1"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>S3 Access Key</Form.Label>
                      <Form.Control
                        type="text"
                        name="s3_access_key"
                        value={formData.s3_access_key}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>S3 Secret Key</Form.Label>
                      <Form.Control
                        type="password"
                        name="s3_secret_key"
                        value={formData.s3_secret_key}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Card.Body>
        </Card>
        
        <div className="d-flex justify-content-end mt-4 mb-5">
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isLoading}
            className="d-flex align-items-center"
          >
            <FontAwesomeIcon icon={faSave} className="me-2" />
            {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SystemSettings; 