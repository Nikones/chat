import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faComments, faFileUpload, faDatabase, faServer, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Загрузка статистики
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // Здесь должен быть запрос к API для получения статистики
        // Для примера используем моковые данные
        const mockStats = {
          totalUsers: 243,
          activeUsers: 187,
          totalMessages: 15720,
          totalFiles: 482,
          totalStorage: 1.2, // ГБ
          serverUptime: 43, // дни
          userActivity: [
            { date: '2023-01', value: 120 },
            { date: '2023-02', value: 135 },
            { date: '2023-03', value: 142 },
            { date: '2023-04', value: 158 },
            { date: '2023-05', value: 170 },
            { date: '2023-06', value: 187 }
          ],
          messageStats: [
            { date: '2023-01', value: 1250 },
            { date: '2023-02', value: 1480 },
            { date: '2023-03', value: 2120 },
            { date: '2023-04', value: 2850 },
            { date: '2023-05', value: 3540 },
            { date: '2023-06', value: 4480 }
          ],
          fileUploads: [
            { date: '2023-01', value: 45 },
            { date: '2023-02', value: 62 },
            { date: '2023-03', value: 78 },
            { date: '2023-04', value: 94 },
            { date: '2023-05', value: 102 },
            { date: '2023-06', value: 101 }
          ],
          storageUsage: [
            { name: 'Изображения', value: 45 },
            { name: 'Документы', value: 25 },
            { name: 'Видео', value: 20 },
            { name: 'Аудио', value: 5 },
            { name: 'Прочее', value: 5 }
          ]
        };
        
        setStats(mockStats);
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        setError('Не удалось загрузить статистику: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, []);
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </Spinner>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }
  
  return (
    <div className="statistics-container">
      <h3 className="mb-4">Статистика системы</h3>
      
      {/* Карточки с ключевыми показателями */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Пользователей</div>
            <div className="stat-details">
              {stats.activeUsers} активных пользователей
            </div>
          </Card>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faComments} />
            </div>
            <div className="stat-value">{stats.totalMessages.toLocaleString()}</div>
            <div className="stat-label">Сообщений</div>
          </Card>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faFileUpload} />
            </div>
            <div className="stat-value">{stats.totalFiles}</div>
            <div className="stat-label">Файлов</div>
            <div className="stat-details">
              {stats.totalStorage} ГБ использовано
            </div>
          </Card>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faServer} />
            </div>
            <div className="stat-value">{stats.serverUptime}</div>
            <div className="stat-label">Дней работы</div>
          </Card>
        </Col>
      </Row>
      
      {/* График активности пользователей */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card className="chart-container">
            <Card.Header className="d-flex align-items-center">
              <FontAwesomeIcon icon={faUsers} className="me-2" />
              Активность пользователей
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={stats.userActivity}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Активных пользователей" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} className="mb-3">
          <Card className="chart-container">
            <Card.Header className="d-flex align-items-center">
              <FontAwesomeIcon icon={faComments} className="me-2" />
              Сообщения по месяцам
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={stats.messageStats}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Количество сообщений" stroke="#82ca9d" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Графики загрузок файлов и хранилища */}
      <Row>
        <Col lg={6} className="mb-3">
          <Card className="chart-container">
            <Card.Header className="d-flex align-items-center">
              <FontAwesomeIcon icon={faFileUpload} className="me-2" />
              Загрузка файлов
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.fileUploads}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Количество файлов" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} className="mb-3">
          <Card className="chart-container">
            <Card.Header className="d-flex align-items-center">
              <FontAwesomeIcon icon={faDatabase} className="me-2" />
              Использование хранилища по типам файлов
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.storageUsage}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="% от общего объема" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <div className="text-muted mt-2 mb-5 text-center">
        <small>Данные обновлены: {new Date().toLocaleString('ru-RU')}</small>
      </div>
    </div>
  );
};

export default Statistics; 