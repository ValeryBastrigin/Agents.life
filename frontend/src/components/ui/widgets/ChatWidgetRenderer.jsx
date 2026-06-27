import React from 'react';
import ScheduleWidget from './ScheduleWidget';

const ChatWidgetRenderer = ({ content }) => {
  try {
    // Try to parse the content as JSON
    const parsedData = JSON.parse(content);
    
    // Check if it's a widget type
    if (parsedData.type === 'schedule') {
      return <ScheduleWidget data={parsedData} />;
    }
    
    // If it's JSON but not a recognized widget type, render as formatted text
    return <div className="text-gray-800 dark:text-white whitespace-pre-wrap">{content}</div>;
  } catch (e) {
    // If it's not JSON, render as regular text with basic formatting
    return <div className="text-gray-800 dark:text-white whitespace-pre-wrap">{content}</div>;
  }
};

export default ChatWidgetRenderer;
