import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Компонент для отображения одного сообщения в чате
 */
const MessageItem = ({ message, isOutgoing }) => {
  // Форматирование времени сообщения
  const formattedTime = message.created_at 
    ? format(new Date(message.created_at), 'HH:mm', { locale: ru })
    : '';

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
