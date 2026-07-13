import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Check, X, Bell, Sparkles, BookOpen, ListTodo, Zap, ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import SecretaryBackground from '../components/SecretaryBackground';
import { useLanguage } from '../contexts/LanguageContext';
import moment from 'moment';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import axios from 'axios';
import 'moment/locale/ru';

const API_URL = 'http://localhost:8001';
const localizer = momentLocalizer(moment);

const Secretary = ({ theme }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [userId] = useState(1);
  const [creatingChat, setCreatingChat] = useState(false);
  
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
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [isPlusAnimating, setIsPlusAnimating] = useState(false);
  const [isPlusAnimating2, setIsPlusAnimating2] = useState(false);

  // Handle plus button animation and redirect
  useEffect(() => {
    if (isPlusAnimating) {
      const timer = setTimeout(() => {
        setSelectedDate(new Date());
        setHeroExpanded(false);
        setIsPlusAnimating(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isPlusAnimating]);

  useEffect(() => {
    if (isPlusAnimating2) {
      const timer = setTimeout(() => {
        setSelectedDate(new Date());
        setHeroExpanded(false);
        setIsPlusAnimating2(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isPlusAnimating2]);

  const handleCreateScheduleChat = async () => {
    setCreatingChat(true);
    try {
       const welcomeMessage = 
        "Привет! 👋 Вот что я умею:\n\n" +
        "📅 **Составить расписание на день** — просто опишите свой обычный день (работа, учёба, отдых), и я создам идеальный график с перерывами и свободным временем.\n\n" +
        "📌 **Создать событие или напоминание** — скажите «запиши встречу в пятницу в 15:00», «напомни купить продукты завтра», «добавь созвон на 10:00» — и я добавлю это в календарь.\n\n" +
        "📸 **Проанализировать скриншот расписания** — пришлите фото/скриншот вашего расписания, и я оценю его и могу добавить в календарь.\n\n" +
        "👀 **Показать расписание** — спросите «что у меня запланировано?» или «покажи расписание на завтра».\n\n" +
        "📝 **Создать заметку** — скажите «сделай заметку» или «запиши идею».\n\n" +
        "Расскажите, чем я могу помочь? 😊";
      
      const response = await axios.post(`${API_URL}/api/chats`, {
        user_id: userId,
        agent_type: "secretary",
        title: "Создание расписания",
        welcome_message: welcomeMessage
      });
      
      const newChatId = response.data.chat_id || response.data.id;
      navigate(`/chat/${newChatId}`);
    } catch (error) {
      console.error('Failed to create schedule chat:', error);
      setCreatingChat(false);
    }
  };

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
        color: event.color,
        completed: event.completed
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
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const colorOptions = [
    { hex: '#3B82F6', label: 'Синий' },
    { hex: '#8B5CF6', label: 'Фиолетовый' },
    { hex: '#10B981', label: 'Зелёный' },
    { hex: '#F59E0B', label: 'Янтарный' },
    { hex: '#EF4444', label: 'Красный' },
    { hex: '#EC4899', label: 'Розовый' },
  ];

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
        const startDate = new Date(tempSlotInfo.start);
        startDate.setHours(startDate.getHours() + 3);
        
        const endDate = new Date(tempSlotInfo.end);
        endDate.setHours(endDate.getHours() + 3);

        const response = await axios.post(`${API_URL}/api/events/${userId}`, {
          title: newEventTitle,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          color: selectedColor
        });
        const newEvent = {
          id: response.data.id,
          title: response.data.title,
          start: new Date(response.data.start),
          end: new Date(response.data.end),
          color: response.data.color,
          completed: false
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
          ? { ...ev, start, end, completed: ev.completed }
          : ev
      ));
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  }, [events]);

  const handleEventResize = useCallback(async ({ event, start, end }) => {
    try {
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
          ? { ...ev, start, end, completed: ev.completed }
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

  const toggleEventCompleted = async (eventId) => {
    try {
      await axios.put(`${API_URL}/api/events/${eventId}/toggle`);
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, completed: !e.completed } : e
      ));
    } catch (error) {
      console.error('Failed to toggle event completion:', error);
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
      <div className="absolute inset-0 pointer-events-none z-0">
        <SecretaryBackground theme={theme} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 relative z-10">
          <div className="max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2.5 bg-surface-light dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[3.5rem] transition-colors"
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

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Schedule Section */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                    {t('schedule')}
                  </h2>
                </div>

                <div className="h-[480px] sm:h-[550px] lg:h-[650px] rounded-[2rem] overflow-hidden bg-background-light dark:bg-background-dark">
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
                        backgroundColor: event.color,
                        border: 'none',
                        borderRadius: '10px',
                        color: '#FFFFFF',
                        fontWeight: 600,
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
              <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-5 sm:p-6 lg:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <Bell size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                      {t('eventsReminders')}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="p-2.5 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] sm:max-h-[450px] lg:max-h-[500px] overflow-y-auto pr-1">
                  {dayReminders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Bell size={24} className="text-purple-400 dark:text-purple-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'ru' ? 'Нет напоминаний на эту дату' : 'No reminders for this date'}
                      </p>
                    </div>
                  ) : (
                    dayReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-3 p-3.5 bg-background-light dark:bg-background-dark rounded-[3rem] group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <button
                          onClick={() => toggleReminder(reminder.id)}
                          className={`p-2 rounded-full transition-colors ${
                            reminder.completed
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-purple-500'
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
                          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
            <div className="bg-background-light dark:bg-background-dark rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                {language === 'ru' ? 'Новое событие' : 'New Event'}
              </h3>
              
              <input
                type="text"
                placeholder={language === 'ru' ? 'Введите текст...' : 'Enter text...'}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[3.5rem] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[3.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={addNewItem}
                  disabled={!newItemText}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 rounded-[3.5rem] text-white font-medium transition-colors"
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
            <div className="bg-background-light dark:bg-background-dark rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[3.5rem] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEvent();
                  } else if (e.key === 'Escape') {
                    handleCancelEvent();
                  }
                }}
              />

              {/* Color Picker */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                  {language === 'ru' ? 'Цвет:' : 'Color:'}
                </span>
                {colorOptions.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className="w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center"
                    style={{ backgroundColor: c.hex }}
                  >
                    {selectedColor === c.hex && (
                      <Check size={14} className="text-white" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEvent}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[3.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!newEventTitle}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 rounded-[3.5rem] text-white font-medium transition-colors"
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
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-6 w-full max-w-md shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
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
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-[3.5rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-[3.5rem] text-white font-medium transition-colors"
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
    <>
      <div className="absolute inset-0 pointer-events-none z-0">
        <SecretaryBackground theme={theme} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 relative z-10">
      <div className="max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto">
        {/* Hero Section — large widget like Mentor */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-[3rem] p-5 mb-6 text-white">
          <button
            onClick={() => setHeroExpanded(!heroExpanded)}
            className="flex items-center justify-between gap-3 w-full text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-4xl shrink-0">📅</div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold mb-0.5">
                  {moment().locale(language === 'ru' ? 'ru' : 'en').format('dddd, DD MMMM YYYY')}
                </h2>
                <p className="text-white/80 text-xs">{language === 'ru' ? 'Планируйте свой день, ставьте задачи и достигайте целей' : 'Plan your day, set tasks and achieve your goals'}</p>
              </div>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0">
              {heroExpanded ? <ChevronUp size={18} className="text-white" /> : <ChevronDown size={18} className="text-white" />}
            </div>
          </button>

          <div className={`overflow-hidden transition-all duration-300 ${heroExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Schedule Container */}
              <div className="bg-white/10 rounded-[3rem] p-4 relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-full bg-white/10">
                    <Clock size={16} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {language === 'ru' ? 'Расписание на сегодня' : "Today's Schedule"}
                  </h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {events.filter(e => moment(e.start).isSame(moment(), 'day')).length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-8 gap-3 transition-all duration-300 ${
                      isPlusAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                    }`}>
                      <button
                        onClick={() => setIsPlusAnimating(true)}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 hover:scale-110 active:scale-95 transition-all duration-200"
                      >
                        <Plus size={28} className="text-white" />
                      </button>
                      <p className="text-xs text-white/50">
                        {language === 'ru' ? 'Нет событий на сегодня' : 'No events today'}
                      </p>
                    </div>
                  ) : (
                    events
                      .filter(e => moment(e.start).isSame(moment(), 'day'))
                      .sort((a, b) => moment(a.start).diff(moment(b.start)))
                      .map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-2.5 bg-white/10 rounded-[2rem] hover:bg-white/15 transition-colors cursor-pointer"
                          onClick={() => setSelectedDate(event.start)}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: event.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium text-white truncate ${
                              event.completed ? 'line-through text-white/40' : ''
                            }`}>
                              {event.title}
                            </p>
                            <p className="text-xs text-white/60 flex items-center gap-1">
                              <Clock size={10} />
                              {moment(event.start).format('HH:mm')} — {moment(event.end).format('HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Events & Reminders Container */}
              <div className="bg-white/10 rounded-[3rem] p-4 relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-full bg-white/10">
                    <Bell size={16} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {language === 'ru' ? 'События и напоминания' : 'Events & Reminders'}
                  </h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {reminders.filter(r => {
                    const reminderDate = r.date ? moment(r.date) : moment(r.created_at);
                    return reminderDate.isSame(moment(), 'day');
                  }).length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-8 gap-3 transition-all duration-300 ${
                      isPlusAnimating2 ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                    }`}>
                      <button
                        onClick={() => setIsPlusAnimating2(true)}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 hover:scale-110 active:scale-95 transition-all duration-200"
                      >
                        <Plus size={28} className="text-white" />
                      </button>
                      <p className="text-xs text-white/50">
                        {language === 'ru' ? 'Нет напоминаний на сегодня' : 'No reminders today'}
                      </p>
                    </div>
                  ) : (
                    reminders
                      .filter(r => {
                        const reminderDate = r.date ? moment(r.date) : moment(r.created_at);
                        return reminderDate.isSame(moment(), 'day');
                      })
                      .map((reminder) => (
                        <div
                          key={reminder.id}
                          className="flex items-center gap-3 p-2.5 bg-white/10 rounded-[2rem] hover:bg-white/15 transition-colors"
                        >
                          <button
                            onClick={() => toggleReminder(reminder.id)}
                            className={`p-1.5 rounded-full transition-colors ${
                              reminder.completed
                                ? 'bg-white/20 text-white'
                                : 'bg-white/10 text-white/70 hover:text-white'
                            }`}
                          >
                            {reminder.completed ? <Check size={12} /> : <Bell size={12} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              reminder.completed
                                ? 'text-white/40 line-through'
                                : 'text-white'
                            }`}>
                              {reminder.text}
                            </p>
                            <p className="text-[10px] text-white/50 mt-0.5">{reminder.time}</p>
                          </div>
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-1.5 rounded-full hover:bg-white/20 text-white/40 hover:text-white/80 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Widgets — horizontal square cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <button 
            onClick={() => navigate('/secretary/guide')} 
            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-surface-dark rounded-[3rem] p-4 sm:p-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              {language === 'ru' ? 'Как пользоваться' : 'How to Use'}
            </span>
          </button>

          <button 
            onClick={() => navigate('/secretary/logs')} 
            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-surface-dark rounded-[3rem] p-4 sm:p-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <ListTodo size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              {language === 'ru' ? 'Журнал действий' : 'Activity Log'}
            </span>
          </button>

          <button 
            onClick={() => navigate('/secretary/notes')} 
            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-surface-dark rounded-[3rem] p-4 sm:p-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Layers size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              {language === 'ru' ? 'Заметки' : 'Notes'}
            </span>
          </button>
        </div>

        {/* Info Banner — одноразовая подсказка */}
        {localStorage.getItem('secretary_calendar_hint') !== 'hidden' && (
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 rounded-[3rem] p-4 mb-4 flex items-center gap-3 border border-blue-200/30 dark:border-blue-700/30">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
              {language === 'ru'
                ? 'Нажмите на дату в календаре, чтобы распланировать расписание и события самостоятельно'
                : 'Click on a date in the calendar to plan your schedule and events manually'}
            </p>
            <button
              onClick={() => localStorage.setItem('secretary_calendar_hint', 'hidden')}
              className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-black/20 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Calendar Section — flat */}
        <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] p-5 sm:p-6 mb-8 shadow-sm border border-gray-100 dark:border-transparent">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigate('PREV')}
                className="p-2.5 bg-white dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white capitalize min-w-[140px] text-center">
                {moment(currentDate).locale(language === 'ru' ? 'ru' : 'en').format('MMMM YYYY')}
              </h2>
              <button
                onClick={() => handleNavigate('NEXT')}
                className="p-2.5 bg-background-light dark:bg-background-dark hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => handleNavigate('TODAY')}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-[2.5rem] transition-colors font-medium text-sm"
            >
              {t('today')}
            </button>
          </div>

          <div className="h-[420px] sm:h-[500px] lg:h-[600px] rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-background-dark border border-gray-200 dark:border-gray-800">
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
                    backgroundColor: isToday ? '#6366F1' : undefined,
                    borderRadius: isToday ? '10px' : undefined,
                    cursor: 'pointer',
                  },
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
                    }}
                  >
                    {children}
                  </div>
                )
              }}
              style={{
                backgroundColor: 'transparent',
              }}
              formats={{
                dayFormat: (date, culture, localizer) =>
                  localizer.format(date, 'ddd', culture).slice(0, 1)
              }}
            />
          </div>
        </div>

        {/* CTA Apple-style */}
        <button
          onClick={handleCreateScheduleChat}
          disabled={creatingChat}
          className="group relative w-full text-left"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-4 sm:gap-5 p-4 sm:p-6 bg-white dark:bg-gray-800/90 backdrop-blur-xl rounded-[3rem] border border-gray-200/60 dark:border-gray-700/40 shadow-sm hover:shadow-lg transition-all duration-300">
            {/* Icon container */}
            <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-purple-500/15 dark:from-blue-500/20 dark:to-purple-500/20 rounded-[2rem] blur-md" />
              <img
                src="/assets/icons/agents/секретарь.svg"
                alt=""
                className="relative w-full h-full scale-150 animate-gentle-bounce group-hover:scale-[1.6] transition-transform duration-300"
              />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white leading-snug">
                {creatingChat ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {language === 'ru' ? 'Создаём чат...' : 'Creating chat...'}
                  </span>
                ) : language === 'ru'
                  ? 'Создайте своё идеальное расписание и достигайте целей'
                  : 'Create your perfect schedule and achieve your goals'}
              </h3>
              {!creatingChat && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-1.5">
                  {language === 'ru'
                    ? 'Поделитесь с Ixteria вашими делами или имеющимся расписанием — AI поможет расставить приоритеты и ничего не упустить'
                    : 'Share your tasks or existing schedule with Ixteria — AI will help prioritize and never miss a thing'}
                </p>
              )}
            </div>
            {/* Chevron */}
            {!creatingChat && (
              <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-200">
                <ArrowRight size={18} />
              </div>
            )}
          </div>
        </button>

      </div>
      </div>
    </>
  );
};

export default Secretary;