import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { 
  Row, 
  Col, 
  Card, 
  Spinner, 
  Alert, 
  ProgressBar 
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faEnvelope, 
  faDatabase, 
  faServer, 
  faMemory 
} from '@fortawesome/free-solid-svg-icons';

const SystemStats = () => {
  const { getStats } = useAdmin();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const statsData = await getStats();
        if (statsData) {
          setStats(statsData);
          setError(null);
        } else {
          setError('Не удалось загрузить статистику');
        }
      } catch (err) {
        console.error('Ошибка при загрузке статистики:', err);
        setError('Ошибка при загрузке статистики');
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [getStats]);
  
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Загрузка статистики...</p>
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
  
  if (!stats) {
    return (
      <Alert variant="info">
        Нет доступной статистики
      </Alert>
    );
  }
  
  return (
    <div>
      <Row>
        <Col md={4} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <FontAwesomeIcon icon={faUsers} size="2x" className="mb-3 text-primary" />
              <h2 className="display-4">{stats.userCount}</h2>
              <Card.Title>Пользователей</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <FontAwesomeIcon icon={faUsers} size="2x" className="mb-3 text-success" />
              <h2 className="display-4">{stats.activeUsers}</h2>
              <Card.Title>Активны сегодня</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <FontAwesomeIcon icon={faEnvelope} size="2x" className="mb-3 text-info" />
              <h2 className="display-4">{stats.messageCount}</h2>
              <Card.Title>Сообщений</Card.Title>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {stats.diskUsage && (
        <Col md={12} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <FontAwesomeIcon icon={faDatabase} size="lg" className="me-2 text-primary" />
                <Card.Title className="mb-0">Использование диска</Card.Title>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>{stats.diskUsage.used} использовано из {stats.diskUsage.total}</span>
                <span>{stats.diskUsage.percentage}%</span>
              </div>
              <ProgressBar 
                variant={
                  stats.diskUsage.percentage > 90 ? 'danger' : 
                  stats.diskUsage.percentage > 70 ? 'warning' : 'success'
                }
                now={stats.diskUsage.percentage} 
              />
            </Card.Body>
          </Card>
        </Col>
      )}
      
      {stats.memoryUsage && (
        <Col md={12} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <FontAwesomeIcon icon={faMemory} size="lg" className="me-2 text-primary" />
                <Card.Title className="mb-0">Использование памяти</Card.Title>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>{stats.memoryUsage.used} использовано из {stats.memoryUsage.total}</span>
                <span>{stats.memoryUsage.percentage}%</span>
              </div>
              <ProgressBar 
                variant={
                  stats.memoryUsage.percentage > 90 ? 'danger' : 
                  stats.memoryUsage.percentage > 70 ? 'warning' : 'success'
                }
                now={stats.memoryUsage.percentage} 
              />
            </Card.Body>
          </Card>
        </Col>
      )}
      
      {stats.cpuUsage && (
        <Col md={12} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <FontAwesomeIcon icon={faServer} size="lg" className="me-2 text-primary" />
                <Card.Title className="mb-0">Использование CPU</Card.Title>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Нагрузка на процессор</span>
                <span>{stats.cpuUsage.percentage}%</span>
              </div>
              <ProgressBar 
                variant={
                  stats.cpuUsage.percentage > 90 ? 'danger' : 
                  stats.cpuUsage.percentage > 70 ? 'warning' : 'success'
                }
                now={stats.cpuUsage.percentage} 
              />
            </Card.Body>
          </Card>
        </Col>
      )}
    </div>
  );
};

export default SystemStats; 