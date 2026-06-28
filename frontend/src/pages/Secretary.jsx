import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Check, X, Bell, Sparkles, BookOpen, ListTodo, Zap, ArrowLeft, Layers } from 'lucide-react';
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

  // Stats for hero section
  const eventsCount = events.filter(e => moment(e.start).isSameOrAfter(moment(), 'day')).length;
  const remindersCount = reminders.filter(r => !r.completed).length;
  const todayEvents = events.filter(e => moment(e.start).isSame(moment(), 'day')).length;

  // Day Details View
  if (selectedDate) {
    const formattedDate = moment(selectedDate).locale(language === 'ru' ? 'ru' : 'en').format('DD MMMM, dddd');
    const dayReminders = reminders.filter(reminder => {
      const reminderDate = reminder.date ? moment(reminder.date) : moment(reminder.created_at);
      return reminderDate.isSame(moment(selectedDate), 'day');
    });
    
    return (
      <>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[3.5rem] transition-all duration-200 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700"
              >
                <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white capitalize leading-tight">
                  {formattedDate}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {dayReminders.length} {language === 'ru' ? 'напоминаний' : 'reminders'} · {events.filter(e => moment(e.start).isSame(selectedDate, 'day')).length} {language === 'ru' ? 'событий' : 'events'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Schedule Section */}
              <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Clock size={20} className="text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {t('schedule')}
                  </h2>
                </div>

                {/* React Big Calendar - Time Grid */}
                <div className="h-[480px] rounded-[3rem] overflow-hidden">
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
                        backgroundColor: `${event.color}20`,
                        border: `2px solid ${event.color}`,
                        borderRadius: '10px',
                        color: event.color,
                        fontWeight: 500,
                        fontSize: '13px',
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
                        `${localizer.format(start, 'HH:mm', culture)} — ${localizer.format(end, 'HH:mm', culture)}`,
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
              <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
                      <Bell size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {t('eventsReminders')}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-[3rem] transition-all duration-200 shadow-md shadow-blue-500/20 hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Reminders List */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {dayReminders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-[3.5rem] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                        <Bell size={28} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'ru' ? 'Нет напоминаний на эту дату' : 'No reminders for this date'}
                      </p>
                    </div>
                  ) : (
                    dayReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[3.5rem] group hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                      >
                        <button
                          onClick={() => toggleReminder(reminder.id)}
                          className={`p-2 rounded-[3rem] transition-all duration-200 ${
                            reminder.completed
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'bg-white dark:bg-gray-700 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm'
                          }`}
                        >
                          {reminder.completed ? <Check size={16} /> : <Bell size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            reminder.completed 
                              ? 'text-gray-400 dark:text-gray-500 line-through' 
                              : 'text-gray-800 dark:text-white'
                          }`}>
                            {reminder.text}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{reminder.time}</p>
                        </div>
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          className="p-2 rounded-[3rem] hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                {language === 'ru' ? 'Новое событие' : 'New Event'}
              </h3>
              
              <input
                type="text"
                placeholder={language === 'ru' ? 'Введите текст...' : 'Enter text...'}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-[3.5rem] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-[3.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={addNewItem}
                  disabled={!newItemText}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 disabled:text-gray-500 rounded-[3.5rem] text-white font-medium transition-all shadow-md shadow-blue-500/20"
                >
                  {language === 'ru' ? 'Добавить' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                {language === 'ru' ? 'Новое событие' : 'New Event'}
              </h3>
              
              {tempSlotInfo && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <Clock size={14} />
                  {`${moment(tempSlotInfo.start).format('HH:mm')} - ${moment(tempSlotInfo.end).format('HH:mm')}`}
                </div>
              )}
              
              <input
                type="text"
                placeholder={language === 'ru' ? 'Введите название события...' : 'Enter event title...'}
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-[3.5rem] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-[3.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!newEventTitle}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 disabled:text-gray-500 rounded-[3.5rem] text-white font-medium transition-all shadow-md shadow-blue-500/20"
                >
                  {language === 'ru' ? 'Сохранить' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-[3.5rem] bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                <X size={24} className="text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2 text-center">
                {language === 'ru' ? 'Удалить событие?' : 'Delete event?'}
              </h3>
              
              {eventToDelete && (
                <div className="mb-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ru' ? 'Вы уверены, что хотите удалить:' : 'Are you sure you want to delete:'}
                  </p>
                  <p className="text-lg font-medium text-gray-800 dark:text-white mt-1">
                    {eventToDelete.title}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 flex items-center justify-center gap-1">
                    <Clock size={12} />
                    {`${moment(eventToDelete.start).format('HH:mm')} - ${moment(eventToDelete.end).format('HH:mm')}`}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-[3.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-[3.5rem] text-white font-medium transition-all shadow-md shadow-red-500/20"
                >
                  {language === 'ru' ? 'Удалить' : 'Delete'}
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
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-700 dark:via-blue-600 dark:to-indigo-700 rounded-[3.5rem] p-6 sm:p-8 mb-8 shadow-lg shadow-blue-500/20">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-white/20 rounded-full" />
          <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-white/15 rounded-full" />
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-white/80" />
                  <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
                    {language === 'ru' ? 'Ваш ассистент' : 'Your Assistant'}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {language === 'ru' ? 'С возвращением!' : 'Welcome back!'}
                </h1>
                <p className="text-white/70 text-sm">
                  {moment().locale(language === 'ru' ? 'ru' : 'en').format('dddd, DD MMMM YYYY')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-[3.5rem] font-medium transition-all duration-200 border border-white/20 hover:border-white/30 self-start"
              >
                <Zap size={16} />
                {language === 'ru' ? 'План на сегодня' : "Today's plan"}
              </button>
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm rounded-[3.5rem] border border-white/10">
                <div className="w-8 h-8 rounded-[3rem] bg-white/20 flex items-center justify-center">
                  <Calendar size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{eventsCount}</div>
                  <div className="text-white/60 text-xs">
                    {language === 'ru' ? 'событий' : 'events'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm rounded-[3.5rem] border border-white/10">
                <div className="w-8 h-8 rounded-[3rem] bg-white/20 flex items-center justify-center">
                  <Bell size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{remindersCount}</div>
                  <div className="text-white/60 text-xs">
                    {language === 'ru' ? 'напоминаний' : 'reminders'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm rounded-[3.5rem] border border-white/10">
                <div className="w-8 h-8 rounded-[3rem] bg-white/20 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{todayEvents}</div>
                  <div className="text-white/60 text-xs">
                    {language === 'ru' ? 'сегодня' : 'today'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => navigate('/secretary/guide')} 
            className="group relative overflow-hidden bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[3.5rem] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <BookOpen size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                  {language === 'ru' ? 'Как пользоваться' : 'How to Use'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {language === 'ru' ? 'Изучите возможности AI-секретаря' : 'Learn about AI secretary features'}
                </p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/secretary/logs')} 
            className="group relative overflow-hidden bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[3.5rem] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                <ListTodo size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                  {language === 'ru' ? 'Журнал действий' : 'Activity Log'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {language === 'ru' ? 'История всех действий секретаря' : 'History of all secretary actions'}
                </p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/secretary/notes')} 
            className="group relative overflow-hidden bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[3.5rem] bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md shadow-green-500/20 group-hover:scale-110 transition-transform duration-300">
                <Layers size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                  {language === 'ru' ? 'Ваши заметки' : 'Your Notes'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {language === 'ru' ? 'Управляйте заметками и идеями' : 'Manage your notes and ideas'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Calendar Section */}
        <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3.5rem] p-5 sm:p-6 mb-8 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigate('PREV')}
                className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-[3rem] transition-all duration-200"
              >
                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white capitalize min-w-[140px] text-center">
                {moment(currentDate).locale(language === 'ru' ? 'ru' : 'en').format('MMMM YYYY')}
              </h2>
              <button
                onClick={() => handleNavigate('NEXT')}
                className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-[3rem] transition-all duration-200"
              >
                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => handleNavigate('TODAY')}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-[3rem] transition-all duration-200 font-medium shadow-md shadow-blue-500/20 hover:shadow-lg text-sm"
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
                    backgroundColor: isToday ? 'rgba(59, 130, 246, 0.08)' : undefined,
                    borderRadius: '10px',
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
        <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3.5rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Calendar size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {language === 'ru' ? 'Расписание и события' : 'Schedule & Events'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWidgetDate(moment(widgetDate).subtract(1, 'day').toDate())}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-[3rem] transition-all duration-200"
              >
                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-base font-semibold text-gray-800 dark:text-white min-w-[80px] text-center">
                {moment(widgetDate).format('DD MMM')}
              </span>
              <button
                onClick={() => setWidgetDate(moment(widgetDate).add(1, 'day').toDate())}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-[3rem] transition-all duration-200"
              >
                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-[3.5rem]">
            <button
              onClick={() => setWidgetMode('schedule')}
              className={`flex-1 px-4 py-2.5 rounded-[3rem] transition-all duration-200 text-sm font-medium ${
                widgetMode === 'schedule'
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {language === 'ru' ? 'Расписание' : 'Schedule'}
            </button>
            <button
              onClick={() => setWidgetMode('events')}
              className={`flex-1 px-4 py-2.5 rounded-[3rem] transition-all duration-200 text-sm font-medium ${
                widgetMode === 'events'
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {language === 'ru' ? 'События и напоминания' : 'Events & Reminders'}
            </button>
          </div>

          <div className="space-y-2.5">
            {widgetMode === 'schedule' ? (
              // Schedule view - show events for the selected date
              events.filter(event => moment(event.start).isSame(widgetDate, 'day')).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-[3.5rem] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                    <Calendar size={28} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ru' ? 'Нет событий на эту дату' : 'No events for this date'}
                  </p>
                </div>
              ) : (
                events
                  .filter(event => moment(event.start).isSame(widgetDate, 'day'))
                  .sort((a, b) => moment(a.start).diff(moment(b.start)))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[3.5rem] hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-600 group"
                      onClick={() => setSelectedDate(event.start)}
                    >
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                        <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30" style={{ backgroundColor: event.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 dark:text-white mb-0.5 truncate">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={12} />
                          {moment(event.start).format('HH:mm')} — {moment(event.end).format('HH:mm')}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-[3.5rem] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                    <Bell size={28} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ru' ? 'Нет событий и напоминаний на эту дату' : 'No events and reminders for this date'}
                  </p>
                </div>
              ) : (
                reminders
                  .filter(reminder => {
                    const reminderDate = reminder.date ? moment(reminder.date) : moment(reminder.created_at);
                    return reminderDate.isSame(widgetDate, 'day');
                  })
                  .map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[3.5rem] group hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    >
                      <button
                        onClick={() => toggleReminder(reminder.id)}
                        className={`p-2 rounded-[3rem] transition-all duration-200 ${
                          reminder.completed
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-gray-700 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm'
                        }`}
                      >
                        {reminder.completed ? <Check size={16} /> : <Bell size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          reminder.completed 
                            ? 'text-gray-400 dark:text-gray-500 line-through' 
                            : 'text-gray-800 dark:text-white'
                        }`}>
                          {reminder.text}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{reminder.time}</p>
                      </div>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-2 rounded-[3rem] hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <X size={16} />
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