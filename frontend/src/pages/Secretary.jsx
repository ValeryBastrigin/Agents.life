import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import moment from 'moment';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

const localizer = momentLocalizer(moment);

const Secretary = ({ theme }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayView, setDayView] = useState('schedule');
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizeDirection, setResizeDirection] = useState(null); // 'start' or 'end'
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Team Meeting',
      start: new Date(new Date().setHours(10, 0, 0, 0)),
      end: new Date(new Date().setHours(11, 0, 0, 0)),
      color: '#3B82F6'
    },
    {
      id: 2,
      title: 'Client Call',
      start: new Date(new Date().setHours(14, 0, 0, 0)),
      end: new Date(new Date().setHours(15, 0, 0, 0)),
      color: '#8B5CF6'
    },
    {
      id: 3,
      title: 'Project Review',
      start: new Date(new Date().setDate(new Date().getDate() + 1)),
      end: new Date(new Date().setDate(new Date().getDate() + 1)),
      color: '#10B981'
    }
  ]);

  const [dayEvents, setDayEvents] = useState([]);
  const [reminders, setReminders] = useState([
    { id: 1, text: 'Send weekly report', time: '09:00', completed: false, color: '#EF4444' },
    { id: 2, text: 'Review PR #123', time: '11:30', completed: true, color: '#F59E0B' },
    { id: 3, text: 'Prepare presentation', time: '15:00', completed: false, color: '#3B82F6' }
  ]);

  const [newReminder, setNewReminder] = useState({ text: '', time: '' });

  const handleNavigate = useCallback((action) => {
    if (action === 'PREV') {
      setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
    } else if (action === 'NEXT') {
      setCurrentDate(moment(currentDate).add(1, 'month').toDate());
    } else if (action === 'TODAY') {
      setCurrentDate(new Date());
    }
  }, [currentDate]);

  const handleSelectEvent = useCallback((event) => {
    setSelectedDate(moment(event.start).toDate());
  }, []);

  const handleSelectSlot = useCallback((slotInfo) => {
    console.log('Slot selected:', slotInfo);
    if (slotInfo && slotInfo.start) {
      setSelectedDate(slotInfo.start);
      // Force re-render by scrolling to top
      window.scrollTo(0, 0);
    }
  }, []);

  const handleDayClick = useCallback((date) => {
    console.log('Day clicked:', date);
    setSelectedDate(date);
    window.scrollTo(0, 0);
  }, []);

  const handleMouseDown = useCallback((hour) => {
    setIsSelecting(true);
    setSelectionStart(hour);
    setSelectionEnd(hour);
  }, []);

  const handleMouseEnter = useCallback((hour) => {
    if (isSelecting) {
      setSelectionEnd(hour);
    }
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // Touch events for mobile
  const handleTouchStart = useCallback((e, hour) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionStart(hour);
    setSelectionEnd(hour);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isSelecting) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const hourElement = element.closest('[data-hour]');
      if (hourElement) {
        const hour = parseInt(hourElement.dataset.hour);
        setSelectionEnd(hour);
      }
    }
  }, [isSelecting]);

  const handleTouchEnd = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Backspace' && editingEventId) {
      setEvents(events.filter(ev => ev.id !== editingEventId));
      setEditingEventId(null);
    }
  }, [editingEventId, events]);

  const handleResizeStart = useCallback((event, direction) => {
    setResizingEvent(event);
    setResizeDirection(direction);
  }, []);

  const handleResizeMove = useCallback((e) => {
    if (!resizingEvent) return;

    const gridRect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - gridRect.top;
    const hourHeight = 48; // h-12 = 48px
    const newHour = Math.floor(relativeY / hourHeight) + 7; // Start from 7:00

    if (newHour >= 7 && newHour <= 21) {
      setEvents(events.map(ev => {
        if (ev.id === resizingEvent.id) {
          if (resizeDirection === 'start') {
            const newStart = moment(selectedDate).set({ hour: newHour, minute: 0 }).toDate();
            if (moment(newStart).isBefore(moment(ev.end))) {
              return { ...ev, start: newStart };
            }
          } else if (resizeDirection === 'end') {
            const newEnd = moment(selectedDate).set({ hour: newHour + 1, minute: 0 }).toDate();
            if (moment(newEnd).isAfter(moment(ev.start))) {
              return { ...ev, end: newEnd };
            }
          }
        }
        return ev;
      }));
    }
  }, [resizingEvent, resizeDirection, selectedDate, events]);

  const handleResizeEnd = useCallback(() => {
    setResizingEvent(null);
    setResizeDirection(null);
  }, []);

  const upcomingEvents = events
    .filter(event => moment(event.start).isSameOrAfter(moment(), 'day'))
    .sort((a, b) => moment(a.start).diff(moment(b.start)))
    .slice(0, 5);

  const addReminder = () => {
    if (newReminder.text && newReminder.time) {
      setReminders([...reminders, {
        id: Date.now(),
        text: newReminder.text,
        time: newReminder.time,
        completed: false,
        color: '#3B82F6'
      }]);
      setNewReminder({ text: '', time: '' });
    }
  };

  const toggleReminder = (id) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, completed: !r.completed } : r
    ));
  };

  const deleteReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  // Day Details View
  if (selectedDate) {
    const formattedDate = moment(selectedDate).locale(language === 'ru' ? 'ru' : 'en').format('DD MMMM, dddd');
    
    return (
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white capitalize">
              {formattedDate}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule Section */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {t('schedule')}
                </h2>
              </div>

              {/* Interactive Time Grid */}
              <div 
                className="space-y-1 max-h-[500px] overflow-y-auto relative"
                onMouseUp={(e) => {
                  handleMouseUp();
                  handleResizeEnd();
                }}
                onMouseMove={handleResizeMove}
                onKeyDown={handleKeyDown}
                tabIndex={0}
              >
                {Array.from({ length: 15 }, (_, i) => {
                  const hour = i + 7;
                  const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
                  
                  // Check if this hour is in selection
                  const isSelected = selectionStart !== null && selectionEnd !== null && 
                    hour >= Math.min(selectionStart, selectionEnd) && 
                    hour <= Math.max(selectionStart, selectionEnd);
                  
                  // Check if there's an event for this hour
                  const hourEvents = events.filter(e => 
                    moment(e.start).isSame(selectedDate, 'day') &&
                    moment(e.start).hour() <= hour &&
                    moment(e.end).hour() > hour
                  );

                  return (
                    <div
                      key={hour}
                      data-hour={hour}
                      className="flex items-center gap-4 relative"
                      onMouseDown={() => handleMouseDown(hour)}
                      onMouseEnter={() => handleMouseEnter(hour)}
                      onTouchStart={(e) => handleTouchStart(e, hour)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <span className="text-sm text-gray-500 dark:text-gray-400 w-16 shrink-0">
                        {timeLabel}
                      </span>
                      <div 
                        className={`flex-1 h-12 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-blue-500/30 border-2 border-blue-500' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        {hourEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEventId(event.id);
                            }}
                            className={`absolute left-20 right-4 rounded-lg px-3 flex items-center cursor-pointer transition-all group ${
                              editingEventId === event.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            style={{
                              backgroundColor: `${event.color}40`,
                              border: `2px solid ${event.color}`,
                              top: `${(moment(event.start).minute() / 60) * 48}px`,
                              height: `${Math.max(48, (moment(event.end).diff(moment(event.start), 'minutes') / 60) * 48)}px`
                            }}
                          >
                            {/* Top resize handle */}
                            <div
                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(event, 'start');
                              }}
                            >
                              <div className="w-8 h-1 bg-gray-400 rounded-full" />
                            </div>
                            
                            <span className="text-sm font-medium" style={{ color: event.color }}>
                              {event.title}
                            </span>
                            
                            {/* Bottom resize handle */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(event, 'end');
                              }}
                            >
                              <div className="w-8 h-1 bg-gray-400 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selection Input */}
              {selectionStart !== null && selectionEnd !== null && !isSelecting && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <input
                    type="text"
                    placeholder="Введите название события..."
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const startHour = Math.min(selectionStart, selectionEnd);
                        const endHour = Math.max(selectionStart, selectionEnd) + 1;
                        
                        const newEvent = {
                          id: Date.now(),
                          title: e.target.value,
                          start: moment(selectedDate).set({ hour: startHour, minute: 0 }).toDate(),
                          end: moment(selectedDate).set({ hour: endHour, minute: 0 }).toDate(),
                          color: '#3B82F6'
                        };
                        
                        setEvents([...events, newEvent]);
                        setSelectionStart(null);
                        setSelectionEnd(null);
                        e.target.value = '';
                      } else if (e.key === 'Escape') {
                        setSelectionStart(null);
                        setSelectionEnd(null);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {`${Math.min(selectionStart, selectionEnd).toString().padStart(2, '0')}:00 - ${Math.max(selectionStart, selectionEnd).toString().padStart(2, '0')}:00`}
                  </div>
                </div>
              )}
            </div>

            {/* Events & Reminders Section */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                {t('eventsReminders')}
              </h2>

              {/* Add New Reminder */}
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder={t('reminderText')}
                    value={newReminder.text}
                    onChange={(e) => setNewReminder({ ...newReminder, text: e.target.value })}
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                    className="px-4 py-2 bg-white dark:bg-gray-700 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addReminder}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium"
                >
                  {t('addReminder')}
                </button>
              </div>

              {/* Reminders List */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl group hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <button
                      onClick={() => toggleReminder(reminder.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        reminder.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}
                    >
                      {reminder.completed && <Check size={14} className="text-white" />}
                    </button>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: reminder.color }} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        reminder.completed
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-800 dark:text-white'
                      }`}>
                        {reminder.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reminder.time}</p>
                    </div>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    >
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Month Overview View
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          {t('secretary')}
        </h1>

        {/* Calendar Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigate('PREV')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white capitalize">
                {moment(currentDate).locale(language === 'ru' ? 'ru' : 'en').format('MMMM YYYY')}
              </h2>
              <button
                onClick={() => handleNavigate('NEXT')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => handleNavigate('TODAY')}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium"
            >
              {t('today')}
            </button>
          </div>

          <div className="h-[400px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              view={Views.MONTH}
              date={currentDate}
              onNavigate={setCurrentDate}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.color,
                  borderRadius: '8px',
                  border: 'none',
                  color: 'white',
                  fontSize: '12px',
                  padding: '2px 4px'
                }
              })}
              dayPropGetter={(date) => {
                const isToday = moment(date).isSame(moment(), 'day');
                return {
                  style: {
                    backgroundColor: isToday ? 'rgba(59, 130, 246, 0.1)' : undefined,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: theme === 'dark' ? '#FFFFFF' : '#374151'
                  },
                  className: isToday ? 'font-bold' : ''
                };
              }}
              components={{
                toolbar: () => null,
                dateCellWrapper: ({ children, value }) => (
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDayClick(value);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDayClick(value);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    style={{ 
                      cursor: 'pointer', 
                      height: '100%', 
                      width: '100%',
                      position: 'relative',
                      zIndex: 10
                    }}
                  >
                    {children}
                  </div>
                ),
                dayWrapper: ({ children, value }) => (
                  <div
                    onClick={() => handleDayClick(value)}
                    style={{ 
                  cursor: 'pointer', 
                  height: '100%', 
                  width: '100%',
                  color: theme === 'dark' ? '#FFFFFF' : '#374151',
                  fontWeight: 600
                }}
                  >
                    {children}
                  </div>
                )
              }}
              style={{
                backgroundColor: 'transparent',
                color: 'inherit'
              }}
              formats={{
                dayFormat: (date, culture, localizer) =>
                  localizer.format(date, 'ddd', culture).slice(0, 1)
              }}
            />
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {t('upcomingEvents')}
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
              <Plus size={18} />
              <span className="text-sm font-medium">{t('addEvent')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('noUpcomingEvents')}
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => setSelectedDate(event.start)}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                      {event.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {moment(event.start).format('DD MMM, HH:mm')}
                    </p>
                  </div>
                  <Clock size={18} className="text-gray-400" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Secretary;
