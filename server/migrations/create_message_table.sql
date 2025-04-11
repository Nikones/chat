-- Добавление новых колонок для шифрования в таблицу messages

-- Сначала проверяем, существует ли таблица
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        -- Проверяем, существуют ли уже новые колонки, чтобы избежать ошибок
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content_encrypted') THEN
            -- Добавляем колонку для шифрованного контента (для PostgreSQL)
            ALTER TABLE messages ADD COLUMN content_encrypted BYTEA;
            
            -- Примечание: в этом месте в реальном проекте нужно было бы мигрировать существующие данные
            -- UPDATE messages SET content_encrypted = CAST(content AS BYTEA) WHERE content IS NOT NULL;
        END IF;
        
        -- Переименовываем старую колонку content в plain_text
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') 
            AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'plain_text') THEN
            ALTER TABLE messages RENAME COLUMN content TO plain_text;
        END IF;
        
        -- Добавляем колонку для типа сообщения, если её ещё нет
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'type') THEN
            ALTER TABLE messages ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'text';
        END IF;
        
        -- Добавляем колонку для хранения ID файла, если это файловое сообщение
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'file_id') THEN
            ALTER TABLE messages ADD COLUMN file_id INTEGER NULL;
        END IF;
    END IF;
END $$;

-- Для MySQL/MariaDB использовали бы 
-- ALTER TABLE messages ADD COLUMN content_encrypted BLOB; 