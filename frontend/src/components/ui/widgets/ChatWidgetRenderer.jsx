import React from 'react';
import ScheduleWidget from './ScheduleWidget';
import EventCreatedWidget from './EventCreatedWidget';
import NoteCreatedWidget from './NoteCreatedWidget';
import FoodLogWidget from './FoodLogWidget';
import MealPlanWidget from './MealPlanWidget';

const ChatWidgetRenderer = ({ content }) => {
  try {
    // Try to parse the content as JSON
    const parsedData = JSON.parse(content);
    
    // Check if it's a widget type
    if (parsedData.type === 'schedule') {
      return <ScheduleWidget data={parsedData} />;
    }
    
    if (parsedData.type === 'event_created') {
      return <EventCreatedWidget data={parsedData} />;
    }
    
    if (parsedData.type === 'note_created') {
      return <NoteCreatedWidget data={parsedData} />;
    }
    
    if (parsedData.type === 'food_log') {
      return <FoodLogWidget data={parsedData} />;
    }
    
    if (parsedData.meals) {
      return <MealPlanWidget data={parsedData} />;
    }
    
    // If it's JSON but not a recognized widget type, render as formatted text
    return <div className="whitespace-pre-wrap">{content}</div>;
  } catch (e) {
    // If it's not JSON, render as regular text with basic formatting
    return <div className="whitespace-pre-wrap">{content}</div>;
  }
};

export default ChatWidgetRenderer;
