import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../contexts/AuthContext';
import authApi from '../../api/auth';

const AdminPanel = () => {
  const { currentUser, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user'
  });

  // Загрузка списка пользователей
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const usersList = await authApi.getUsers(token);
      setUsers(usersList);
    } catch (err) {
      console.error('Ошибка при загрузке пользователей:', err);
      setError('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем список пользователей при монтировании компонента
    fetchUsers();
  }, [token]);

  // Проверка, является ли текущий пользователь администратором
  if (currentUser?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          У вас нет прав для доступа к этой странице
        </Alert>
      </Box>
    );
  }

  // Обработчик создания нового пользователя
  const handleCreateUser = async () => {
    try {
      setError('');
      
      // Валидация
      if (!newUser.username || !newUser.password) {
        setError('Заполните все обязательные поля');
        return;
      }
      
      if (newUser.username.length < 3) {
        setError('Имя пользователя должно содержать не менее 3 символов');
        return;
      }
      
      if (newUser.password.length < 8) {
        setError('Пароль должен содержать не менее 8 символов');
        return;
      }
      
      // Создание пользователя
      await authApi.createUser(newUser, token);
      
      // Сброс формы и закрытие диалога
      setNewUser({
        username: '',
        password: '',
        role: 'user'
      });
      setOpenDialog(false);
      
      // Обновление списка пользователей
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при создании пользователя:', err);
      setError(err.message || 'Не удалось создать пользователя');
    }
  };

  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Управление пользователями
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Добавить пользователя
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Имя пользователя</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Создан</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        disabled={user.id === currentUser.id} // Нельзя удалить текущего пользователя
                        aria-label="удалить пользователя"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Нет пользователей
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог создания пользователя */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Добавить нового пользователя</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="username"
            name="username"
            label="Имя пользователя"
            type="text"
            fullWidth
            variant="outlined"
            value={newUser.username}
            onChange={handleInputChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label="Пароль"
            type="password"
            fullWidth
            variant="outlined"
            value={newUser.password}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="role-label">Роль</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={newUser.role}
              label="Роль"
              onChange={handleInputChange}
            >
              <MenuItem value="user">Пользователь</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel; 