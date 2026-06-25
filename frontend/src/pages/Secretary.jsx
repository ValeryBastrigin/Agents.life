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
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [tempSlotInfo, setTempSlotInfo] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
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
    setEventToDelete(event);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (eventToDelete) {
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      setShowDeleteModal(false);
      setEventToDelete(null);
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

  const handleSaveEvent = useCallback(() => {
    if (newEventTitle && tempSlotInfo) {
      const newEvent = {
        id: Date.now(),
        title: newEventTitle,
        start: new Date(tempSlotInfo.start),
        end: new Date(tempSlotInfo.end),
        color: '#3B82F6'
      };
      console.log('Creating event:', newEvent);
      setEvents([...events, newEvent]);
      setShowEventModal(false);
      setNewEventTitle('');
      setTempSlotInfo(null);
    }
  }, [newEventTitle, tempSlotInfo, events]);

  const handleCancelEvent = useCallback(() => {
    setShowEventModal(false);
    setNewEventTitle('');
    setTempSlotInfo(null);
  }, []);

  const handleEventDrop = useCallback(({ event, start, end }) => {
    setEvents(events.map(ev => 
      ev.id === event.id 
        ? { ...ev, start, end }
        : ev
    ));
  }, [events]);

  const handleEventResize = useCallback(({ event, start, end }) => {
    setEvents(events.map(ev => 
      ev.id === event.id 
        ? { ...ev, start, end }
        : ev
    ));
  }, [events]);

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
      <>
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

                {/* React Big Calendar - Time Grid */}
                <div className="h-[500px]">
                  <BigCalendar
                    localizer={localizer}
                    events={events}
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!newEventTitle}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 rounded-xl text-white font-medium transition-colors"
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
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-colors"
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
