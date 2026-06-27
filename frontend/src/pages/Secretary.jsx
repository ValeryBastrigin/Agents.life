import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Check, X, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import moment from 'moment';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import axios from 'axios';

const API_URL = 'http://localhost:8001';
const localizer = momentLocalizer(moment);

const Secretary = ({ theme }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [userId] = useState(1);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayView, setDayView] = useState('schedule');
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [tempSlotInfo, setTempSlotInfo] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [events, setEvents] = useState([]);

  const [dayEvents, setDayEvents] = useState([]);
  const [reminders, setReminders] = useState([]);

  // Load events and reminders on mount
  useEffect(() => {
    loadEvents();
    loadReminders();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/events/${userId}`);
      const formattedEvents = response.data.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        color: event.color
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadReminders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reminders/${userId}`);
      setReminders(response.data);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    }
  };

  const [newReminder, setNewReminder] = useState({ text: '', time: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [widgetDate, setWidgetDate] = useState(new Date());
  const [widgetMode, setWidgetMode] = useState('schedule'); // 'schedule' or 'events'

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
    setEventToDelete(event);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (eventToDelete) {
      try {
        await axios.delete(`${API_URL}/api/events/${eventToDelete.id}`);
        setEvents(events.filter(e => e.id !== eventToDelete.id));
        setShowDeleteModal(false);
        setEventToDelete(null);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  }, [eventToDelete, events]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  }, []);

  const handleDayClick = useCallback((date) => {
    console.log('Day clicked:', date);
    setSelectedDate(date);
    window.scrollTo(0, 0);
  }, []);

  const handleSelectSlot = useCallback((slotInfo) => {
    console.log('Slot selected:', slotInfo);
    console.log('Selected date:', selectedDate);
    if (slotInfo && slotInfo.start && slotInfo.end) {
      setTempSlotInfo(slotInfo);
      setNewEventTitle('');
      setShowEventModal(true);
    }
  }, [selectedDate]);

  const handleSaveEvent = useCallback(async () => {
    if (newEventTitle && tempSlotInfo) {
      try {
        // Add 3 hours to compensate for UTC+3 timezone
        const startDate = new Date(tempSlotInfo.start);
        startDate.setHours(startDate.getHours() + 3);
        
        const endDate = new Date(tempSlotInfo.end);
        endDate.setHours(endDate.getHours() + 3);

        const response = await axios.post(`${API_URL}/api/events/${userId}`, {
          title: newEventTitle,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          color: '#3B82F6'
        });
        const newEvent = {
          id: response.data.id,
          title: response.data.title,
          start: new Date(response.data.start),
          end: new Date(response.data.end),
          color: response.data.color
        };
        setEvents([...events, newEvent]);
        setShowEventModal(false);
        setNewEventTitle('');
        setTempSlotInfo(null);
      } catch (error) {
        console.error('Failed to create event:', error);
      }
    }
  }, [newEventTitle, tempSlotInfo, events, userId]);

  const handleCancelEvent = useCallback(() => {
    setShowEventModal(false);
    setNewEventTitle('');
    setTempSlotInfo(null);
  }, []);

  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    try {
      // Add 3 hours to compensate for UTC+3 timezone
      const startDate = new Date(start);
      startDate.setHours(startDate.getHours() + 3);
      
      const endDate = new Date(end);
      endDate.setHours(endDate.getHours() + 3);

      await axios.put(`${API_URL}/api/events/${event.id}`, {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      });
      setEvents(events.map(ev =>
        ev.id === event.id
          ? { ...ev, start, end }
          : ev
      ));
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  }, [events]);

  const handleEventResize = useCallback(async ({ event, start, end }) => {
    try {
      // Add 3 hours to compensate for UTC+3 timezone
      const startDate = new Date(start);
      startDate.setHours(startDate.getHours() + 3);
      
      const endDate = new Date(end);
      endDate.setHours(endDate.getHours() + 3);

      await axios.put(`${API_URL}/api/events/${event.id}`, {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      });
      setEvents(events.map(ev =>
        ev.id === event.id
          ? { ...ev, start, end }
          : ev
      ));
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  }, [events]);

  const upcomingEvents = events
    .filter(event => moment(event.start).isSameOrAfter(moment(), 'day'))
    .sort((a, b) => moment(a.start).diff(moment(b.start)))
    .slice(0, 5);

  const addReminder = async () => {
    if (newReminder.text && newReminder.time) {
      try {
        const response = await axios.post(`${API_URL}/api/reminders/${userId}`, {
          text: newReminder.text,
          time: newReminder.time,
          color: '#3B82F6'
        });
        setReminders([...reminders, response.data]);
        setNewReminder({ text: '', time: '' });
      } catch (error) {
        console.error('Failed to create reminder:', error);
      }
    }
  };

  const addNewItem = async () => {
    if (newItemText) {
      try {
        const response = await axios.post(`${API_URL}/api/reminders/${userId}`, {
          text: newItemText,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
          color: '#3B82F6'
        });
        setReminders([...reminders, response.data]);
        setNewItemText('');
        setShowAddModal(false);
      } catch (error) {
        console.error('Failed to create reminder:', error);
      }
    }
  };

  const toggleReminder = async (id) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      await axios.put(`${API_URL}/api/reminders/${id}`, {
        completed: !reminder.completed
      });
      setReminders(reminders.map(r =>
        r.id === id ? { ...r, completed: !r.completed } : r
      ));
    } catch (error) {
      console.error('Failed to toggle reminder:', error);
    }
  };

  const deleteReminder = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/reminders/${id}`);
      setReminders(reminders.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  };

  // Day Details View
  if (selectedDate) {
    const formattedDate = moment(selectedDate).locale(language === 'ru' ? 'ru' : 'en').format('DD MMMM, dddd');
    
    return (
      <>
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[1.5rem] transition-colors"
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

                {/* React Big Calendar - Time Grid */}
                <div className="h-[500px]">
                  <BigCalendar
                    localizer={localizer}
                    events={events.filter(event => moment(event.start).isSame(selectedDate, 'day'))}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    views={[Views.DAY]}
                    defaultView={Views.DAY}
                    date={selectedDate}
                    onNavigate={() => {}}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onEventDrop={handleEventDrop}
                    onEventResize={handleEventResize}
                    resizable
                    eventPropGetter={(event) => ({
                      style: {
                        backgroundColor: `${event.color}40`,
                        border: `2px solid ${event.color}`,
                        borderRadius: '8px',
                        color: event.color
                      }
                    })}
                    dayPropGetter={(date) => ({
                      style: {
                        backgroundColor: 'transparent'
                      }
                    })}
                    components={{
                      toolbar: () => null
                    }}
                    formats={{
                      timeGutterFormat: (date, culture, localizer) =>
                        localizer.format(date, 'HH:mm', culture),
                      eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                        `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
                      dayHeaderFormat: (date, culture, localizer) =>
                        localizer.format(date, 'dddd', culture),
                      dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                        `${localizer.format(start, 'DD MMM', culture)} - ${localizer.format(end, 'DD MMM', culture)}`
                    }}
                    step={60}
                    timeslots={1}
                  />
                </div>
              </div>

              {/* Events & Reminders Section */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {t('eventsReminders')}
                  </h2>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-[1.5rem] transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Reminders List */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {reminders
                    .filter(reminder => {
                      const reminderDate = reminder.date ? moment(reminder.date) : moment(reminder.created_at);
                      const selectedDateMoment = selectedDate ? moment(selectedDate) : moment();
                      return reminderDate.isSame(selectedDateMoment, 'day');
                    })
                    .map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] group hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <button
                        onClick={() => toggleReminder(reminder.id)}
                        className={`p-2 rounded-full transition-colors ${
                          reminder.completed
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        <Bell size={18} />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">
                          {reminder.text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reminder.time}</p>
                      </div>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-[1.5rem] transition-all"
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

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                {language === 'ru' ? 'Новое событие' : 'New Event'}
              </h3>
              
              <input
                type="text"
                placeholder={language === 'ru' ? 'Введите текст...' : 'Enter text...'}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addNewItem();
                  } else if (e.key === 'Escape') {
                    setShowAddModal(false);
                    setNewItemText('');
                  }
                }}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewItemText('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-[1.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={addNewItem}
                  disabled={!newItemText}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 rounded-[1.5rem] text-white font-medium transition-colors"
                >
                  {language === 'ru' ? 'Добавить' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Новое событие
              </h3>
              
              {tempSlotInfo && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {`${moment(tempSlotInfo.start).format('HH:mm')} - ${moment(tempSlotInfo.end).format('HH:mm')}`}
                </div>
              )}
              
              <input
                type="text"
                placeholder="Введите название события..."
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEvent();
                  } else if (e.key === 'Escape') {
                    handleCancelEvent();
                  }
                }}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEvent}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-[1.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!newEventTitle}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 rounded-[1.5rem] text-white font-medium transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Удалить событие?
              </h3>
              
              {eventToDelete && (
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Вы уверены, что хотите удалить событие:
                  </p>
                  <p className="text-lg font-medium text-gray-800 dark:text-white mt-2">
                    {eventToDelete.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {`${moment(eventToDelete.start).format('HH:mm')} - ${moment(eventToDelete.end).format('HH:mm')}`}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-[1.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-[1.5rem] text-white font-medium transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Month Overview View
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Info Blocks */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* How to Use Agent Block */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-[1.5rem] p-4 text-white cursor-pointer hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <Calendar size={20} />
            </div>
            <h3 className="text-sm font-semibold">
              {language === 'ru' ? 'Как пользоваться Агентом' : 'How to Use Agent'}
            </h3>
          </div>

          {/* Recent Secretary Records Block */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-[1.5rem] p-4 text-white cursor-pointer hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-semibold">
              {language === 'ru' ? 'Последние записи секретаря' : 'Recent Secretary Records'}
            </h3>
          </div>

          {/* Your Notes Block */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-[1.5rem] p-4 text-white cursor-default flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <Plus size={20} />
            </div>
            <h3 className="text-sm font-semibold">
              {language === 'ru' ? 'Ваши заметки' : 'Your Notes'}
            </h3>
          </div>

        </div>

        {/* Calendar Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigate('PREV')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[1.5rem] transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white capitalize">
                {moment(currentDate).locale(language === 'ru' ? 'ru' : 'en').format('MMMM YYYY')}
              </h2>
              <button
                onClick={() => handleNavigate('NEXT')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[1.5rem] transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => handleNavigate('TODAY')}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-[1.5rem] transition-colors font-medium"
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

        {/* Schedule & Events Widget */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {language === 'ru' ? 'Расписание и события' : 'Schedule & Events'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWidgetDate(moment(widgetDate).subtract(1, 'day').toDate())}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[1.5rem] transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-lg font-medium text-gray-800 dark:text-white">
                {moment(widgetDate).format('DD MMM')}
              </span>
              <button
                onClick={() => setWidgetDate(moment(widgetDate).add(1, 'day').toDate())}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[1.5rem] transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setWidgetMode('schedule')}
              className={`flex-1 px-4 py-2 rounded-[1.5rem] transition-colors ${
                widgetMode === 'schedule'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {language === 'ru' ? 'Расписание' : 'Schedule'}
            </button>
            <button
              onClick={() => setWidgetMode('events')}
              className={`flex-1 px-4 py-2 rounded-[1.5rem] transition-colors ${
                widgetMode === 'events'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {language === 'ru' ? 'События и напоминания' : 'Events & Reminders'}
            </button>
          </div>

          <div className="space-y-3">
            {widgetMode === 'schedule' ? (
              // Schedule view - show events for the selected date
              events.filter(event => moment(event.start).isSame(widgetDate, 'day')).length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {language === 'ru' ? 'Нет событий на эту дату' : 'No events for this date'}
                </p>
              ) : (
                events
                  .filter(event => moment(event.start).isSame(widgetDate, 'day'))
                  .sort((a, b) => moment(a.start).diff(moment(b.start)))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedDate(event.start)}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                          {event.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                        </p>
                      </div>
                      <Clock size={18} className="text-gray-400" />
                    </div>
                  ))
              )
            ) : (
              // Events & Reminders view - show reminders for the selected date
              reminders
                .filter(reminder => {
                  const reminderDate = reminder.date ? moment(reminder.date) : moment(reminder.created_at);
                  return reminderDate.isSame(widgetDate, 'day');
                })
                .length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {language === 'ru' ? 'Нет событий и напоминаний на эту дату' : 'No events and reminders for this date'}
                </p>
              ) : (
                reminders
                  .filter(reminder => {
                    const reminderDate = reminder.date ? moment(reminder.date) : moment(reminder.created_at);
                    return reminderDate.isSame(widgetDate, 'day');
                  })
                  .map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] group hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <button
                        onClick={() => toggleReminder(reminder.id)}
                        className={`p-2 rounded-full transition-colors ${
                          reminder.completed
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        <Bell size={18} />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">
                          {reminder.text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reminder.time}</p>
                      </div>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-[1.5rem] transition-all"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>
                  ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Secretary;
