import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Container className="py-5 text-center">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <div className="not-found-container">
            <h1 className="display-1">404</h1>
            <h2 className="mb-4">Страница не найдена</h2>
            <p className="lead mb-4">
              Извините, но запрашиваемая вами страница не существует или была перемещена.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Button as={Link} to="/" variant="primary">
                Вернуться на главную
              </Button>
              <Button as="a" href="javascript:history.back()" variant="outline-secondary">
                Вернуться назад
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound; 