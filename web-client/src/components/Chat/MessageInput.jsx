import React, { useState, useRef } from 'react';
import { Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, faPaperclip, faImage, 
  faFile, faLock, faFaceSmile
} from '@fortawesome/free-solid-svg-icons';
import { Picker } from 'emoji-mart';
import { useMessages } from '../../contexts/MessageContext';
import './MessageInput.css';

const MessageInput = ({ chatId }) => {
  const { sendMessage, sendFile, encryptionEnabled } = useMessages();
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  // Обработка отправки сообщения
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if ((message.trim() || files.length > 0) && chatId) {
      sendMessage(chatId, message.trim(), files);
      setMessage('');
      setFiles([]);
    }
  };
  
  // Добавление эмодзи в текст сообщения
  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji.native);
  };
  
  // Обработка выбора файлов
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };
  
  // Удаление выбранного файла
  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Получение информации о размере файла в читаемом формате
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Закрытие эмодзи пикера при клике вне его области
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="message-input">
      {/* Предпросмотр выбранных файлов */}
      {files.length > 0 && (
        <div className="selected-files">
          {files.map((file, index) => (
            <div key={index} className="selected-file">
              <div className="file-preview">
                {file.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name} 
                    className="file-preview-img"
                  />
                ) : (
                  <div className="file-icon">
                    <FontAwesomeIcon icon={faFile} />
                  </div>
                )}
              </div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <Button 
                variant="link" 
                className="remove-file-btn"
                onClick={() => handleRemoveFile(index)}
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          {/* Кнопка добавления файлов */}
          <Dropdown>
            <Dropdown.Toggle variant="light" id="dropdown-attachment" className="attachment-btn">
              <FontAwesomeIcon icon={faPaperclip} />
            </Dropdown.Toggle>
            
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => fileInputRef.current.click()}>
                <FontAwesomeIcon icon={faFile} className="me-2" />
                Документ
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.click();
                }}
              >
                <FontAwesomeIcon icon={faImage} className="me-2" />
                Изображение
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="d-none" 
            multiple
            onChange={handleFileSelect}
          />
          
          {/* Поле ввода сообщения */}
          <Form.Control
            type="text"
            placeholder="Введите сообщение..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="message-input-field"
          />
          
          {/* Кнопка выбора эмодзи */}
          <div className="emoji-picker-container" ref={emojiPickerRef}>
            <Button 
              variant="light" 
              className="emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <FontAwesomeIcon icon={faFaceSmile} />
            </Button>
            
            {showEmojiPicker && (
              <div className="emoji-picker">
                <Picker 
                  onSelect={handleEmojiSelect}
                  title="Выберите эмодзи"
                  emoji="point_up"
                  i18n={{
                    search: 'Поиск',
                    categories: {
                      search: 'Результаты поиска',
                      recent: 'Часто используемые',
                      people: 'Смайлы и люди',
                      nature: 'Животные и природа',
                      foods: 'Еда и напитки',
                      activity: 'Активности',
                      places: 'Путешествия и места',
                      objects: 'Объекты',
                      symbols: 'Символы',
                      flags: 'Флаги',
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Индикатор шифрования */}
          {encryptionEnabled && (
            <div className="encryption-indicator">
              <FontAwesomeIcon icon={faLock} className="encryption-icon" />
            </div>
          )}
          
          {/* Кнопка отправки сообщения */}
          <Button 
            variant="primary" 
            type="submit"
            className="send-btn"
            disabled={!message.trim() && files.length === 0}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </Button>
        </InputGroup>
      </Form>
    </div>
  );
};

export default MessageInput; 