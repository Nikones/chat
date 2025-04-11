import React from 'react';
import { Container } from 'react-bootstrap';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="admin-footer">
      <Container fluid>
        <div className="footer-content">
          <div className="footer-text">
            &copy; {currentYear} Мессенджер Кикиты - Административная панель
          </div>
          <div className="footer-version">
            Версия 1.0.0
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 