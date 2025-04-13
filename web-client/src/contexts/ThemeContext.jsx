import React, { createContext, useContext, useState, useEffect } from 'react';

// Создаем контекст с начальными значениями
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

// Хук для использования контекста темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }
  return context;
};

// Провайдер контекста темы
export const ThemeProvider = ({ children }) => {
  // Получаем сохраненную тему из localStorage или используем светлую тему по умолчанию
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // Переключение между темной и светлой темой
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  // Применяем тему к документу при изменении
  useEffect(() => {
    // Добавляем или удаляем класс dark у body
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
    // Устанавливаем мета-тег theme-color для мобильных браузеров
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1a1a1a' : '#ffffff'
      );
    }
  }, [theme]);

  // Значение контекста
  const contextValue = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}; 