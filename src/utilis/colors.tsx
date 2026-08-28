// utils/minecraftColors.ts

import React from "react";

export const MINECRAFT_COLORS: Record<string, string> = {
  '0': '#000000', // черный
  '1': '#0000AA', // темно-синий
  '2': '#00AA00', // темно-зеленый
  '3': '#00AAAA', // темно-бирюзовый
  '4': '#AA0000', // темно-красный
  '5': '#AA00AA', // темно-фиолетовый
  '6': '#FFAA00', // золотой
  '7': '#AAAAAA', // серый
  '8': '#555555', // темно-серый
  '9': '#5555FF', // синий
  'a': '#55FF55', // зеленый
  'b': '#55FFFF', // бирюзовый
  'c': '#FF5555', // красный
  'd': '#FF55FF', // розовый
  'e': '#FFFF55', // желтый
  'f': '#FFFFFF', // белый
};

// Форматирование (жирный, курсив и т.д.)
export const MINECRAFT_FORMATS: Record<string, string> = {
  'l': 'font-weight: bold;',
  'o': 'font-style: italic;',
  'n': 'text-decoration: underline;',
  'm': 'text-decoration: line-through;',
  'r': 'reset',
};

/**
 * Преобразует строку с кодами § в HTML с цветами
 */
export function parseMinecraftText(text: string): string {
  if (!text) return '';
  
  // Разбиваем текст по символу §
  const parts = text.split('§');
  
  if (parts.length === 1) {
    // Нет кодов форматирования
    return escapeHtml(text);
  }
  
  let result = '';
  let currentColor = '';
  let currentFormat = '';
  
  // Первая часть без форматирования
  result += escapeHtml(parts[0]);
  
  // Обрабатываем остальные части
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) continue;
    
    const code = part[0].toLowerCase();
    const textPart = part.slice(1);
    
    // Проверяем цвет
    if (MINECRAFT_COLORS[code]) {
      currentColor = MINECRAFT_COLORS[code];
      // Вставляем span с цветом
      result += `<span style="color: ${currentColor};">${escapeHtml(textPart)}</span>`;
    } 
    // Проверяем форматирование
    else if (MINECRAFT_FORMATS[code]) {
      if (MINECRAFT_FORMATS[code] === 'reset') {
        // Сбрасываем форматирование
        currentColor = '';
        currentFormat = '';
        result += escapeHtml(textPart);
      } else {
        // Применяем форматирование
        const style = MINECRAFT_FORMATS[code];
        const colorStyle = currentColor ? `color: ${currentColor};` : '';
        result += `<span style="${colorStyle} ${style}">${escapeHtml(textPart)}</span>`;
      }
    } 
    // Неизвестный код - просто выводим текст
    else {
      result += escapeHtml(textPart);
    }
  }
  
  return result;
}

/**
 * Экранирует HTML специальные символы
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Альтернативный вариант - возвращает React элементы
 */
export function parseMinecraftTextToReact(text: string): React.ReactNode[] {
  if (!text) return [text];
  
  const parts = text.split('§');
  
  if (parts.length === 1) {
    return [text];
  }
  
  const result: React.ReactNode[] = [];
  result.push(parts[0]);
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) continue;
    
    const code = part[0].toLowerCase();
    const textPart = part.slice(1);
    
    if (MINECRAFT_COLORS[code]) {
      result.push(
        <span key={i} style={{ color: MINECRAFT_COLORS[code] }}>
          {textPart}
        </span>
      );
    } else if (MINECRAFT_FORMATS[code]) {
      if (MINECRAFT_FORMATS[code] === 'reset') {
        result.push(textPart);
      } else {
        // Просто применяем стиль
        result.push(
          <span key={i} style={{ color: 'inherit' }}>
            {textPart}
          </span>
        );
      }
    } else {
      result.push(textPart);
    }
  }
  
  return result;
}

/**
 * Удаляет все коды § из текста (для plain text)
 */
export function stripMinecraftColors(text: string): string {
  if (!text) return '';
  return text.replace(/§[0-9a-fk-or]/gi, '');
}