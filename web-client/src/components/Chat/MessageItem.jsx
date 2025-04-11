import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  IconButton,
  Link
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GetAppIcon from '@mui/icons-material/GetApp';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoFileIcon from '@mui/icons-material/VideoLibrary';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import filesApi from '../../api/files';

/**
 * Компонент для отображения одного сообщения в чате
 */
const MessageItem = ({ message, isOutgoing }) => {
  // Форматирование времени сообщения
  const formattedTime = message.created_at 
    ? format(new Date(message.created_at), 'HH:mm', { locale: ru })
    : '';
  
  // Проверяем, есть ли у сообщения файлы
  const hasFiles = message.files && message.files.length > 0;
  const messageType = message.message_type || 'text';
  
  // Определяем иконку в зависимости от типа файла
  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image':
        return null; // Для изображений используется превью
      case 'document':
        return <PictureAsPdfIcon fontSize="large" />;
      case 'audio':
        return <AudioFileIcon fontSize="large" />;
      case 'video':
        return <VideoFileIcon fontSize="large" />;
      default:
        return <InsertDriveFileIcon fontSize="large" />;
    }
  };
  
  // Рендер файла в сообщении
  const renderFile = (file) => {
    const downloadUrl = filesApi.getDownloadUrl(file.download_token);
    const fileSize = filesApi.formatFileSize(file.file_size);
    
    return (
      <Card key={file.id} sx={{ maxWidth: 300, mb: 1, backgroundColor: 'transparent' }}>
        {file.file_type === 'image' ? (
          <CardMedia
            component="img"
            height="140"
            image={downloadUrl}
            alt={file.file_name}
            sx={{ objectFit: 'contain' }}
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            p: 2, 
            backgroundColor: 'background.default' 
          }}>
            {getFileIcon(file.file_type)}
          </Box>
        )}
        <CardContent sx={{ p: 1 }}>
          <Typography variant="body2" noWrap title={file.file_name}>
            {file.file_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fileSize}
          </Typography>
        </CardContent>
        <CardActions>
          <Button 
            size="small" 
            startIcon={<GetAppIcon />}
            component={Link}
            href={downloadUrl}
            target="_blank"
            download
          >
            Скачать
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        mb: 1.5,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          maxWidth: '80%',
          borderRadius: 2,
          bgcolor: isOutgoing ? 'primary.dark' : 'background.paper',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            ...(isOutgoing
              ? {
                  borderWidth: '0 0 12px 12px',
                  borderColor: `transparent transparent ${(theme) => theme.palette.primary.dark} transparent`,
                  right: -6,
                  bottom: 0,
                }
              : {
                  borderWidth: '12px 0 0 12px',
                  borderColor: `transparent transparent transparent ${(theme) => theme.palette.background.paper}`,
                  left: -6,
                  bottom: 0,
                }),
          },
        }}
      >
        {/* Файлы */}
        {hasFiles && message.files.map(file => renderFile(file))}
        
        {/* Текстовое содержимое */}
        {message.content && (
          <Typography
            variant="body1"
            sx={{
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </Typography>
        )}
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            mt: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            {formattedTime}
          </Typography>
          
          {isOutgoing && (
            message.is_read ? (
              <DoneAllIcon sx={{ fontSize: 14, color: 'primary.light' }} />
            ) : (
              <DoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            )
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MessageItem;
