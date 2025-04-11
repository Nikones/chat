import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Image } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setAvatarPreview(user.avatar_url || '');
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const formData = new FormData();
      formData.append('display_name', displayName);
      formData.append('email', email);
      formData.append('bio', bio);
      
      if (avatar) {
        formData.append('avatar', avatar);
      }
      
      await updateProfile(formData);
      setSuccess('Профиль успешно обновлен');
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <Card>
            <Card.Header as="h4">Профиль пользователя</Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <Row className="mb-4 align-items-center">
                <Col xs={12} md={4} className="text-center mb-3 mb-md-0">
                  <div className="avatar-container mx-auto">
                    <Image 
                      src={avatarPreview || '/assets/default-avatar.png'} 
                      roundedCircle 
                      className="profile-avatar mb-2" 
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                    />
                    <div className="mt-2">
                      <Form.Group controlId="avatar">
                        <Form.Label className="btn btn-outline-primary btn-sm">
                          Изменить фото
                          <Form.Control 
                            type="file" 
                            className="d-none" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                          />
                        </Form.Label>
                      </Form.Group>
                    </div>
                  </div>
                </Col>
                
                <Col xs={12} md={8}>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="displayName">
                      <Form.Label>Отображаемое имя</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        placeholder="Ваше имя"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="email@example.com"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="bio">
                      <Form.Label>О себе</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={3} 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="Расскажите о себе"
                      />
                    </Form.Group>
                    
                    <div className="d-grid">
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading}
                      >
                        {loading ? 'Сохранение...' : 'Сохранить изменения'}
                      </Button>
                    </div>
                  </Form>
                </Col>
              </Row>
              
              <hr />
              
              <div className="user-info mt-4">
                <h5>Информация об аккаунте</h5>
                <p><strong>Имя пользователя:</strong> {user?.username}</p>
                <p><strong>Роль:</strong> {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                <p><strong>Дата регистрации:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Н/Д'}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 