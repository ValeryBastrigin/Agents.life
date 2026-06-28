import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Pin, Trash2, Check, Palette, Sparkles, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
var API='http://localhost:8001/api'; var uid=1;
var COLORS=['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#6366F1','#14B8A6'];

export default function NotesList() {
  var { language } = useLanguage(); var nav = useNavigate(); var ru=language==='ru';
  var [notes,setNotes]=useState([]); var [sel,setSel]=useState(new Set()); var lp=useRef(null); var [cp,setCp]=useState(false);
  var load=useCallback(async function(){ try{var r=await axios.get(API+'/notes/'+uid);setNotes(r.data)}catch(e){}},[]);
  useEffect(function(){load()},[load]);
  async function bPin(){ for(var id of sel){ var n=notes.find(function(x){return x.id===id}); await axios.put(API+'/notes/'+id,{is_pinned:!n.is_pinned}) } setSel(new Set()); load() }
  async function bDel(){ for(var id of sel){ await axios.delete(API+'/notes/'+id) } setSel(new Set()); load() }
  async function bColor(c){ for(var id of sel){ await axios.put(API+'/notes/'+id,{color:c}) } setSel(new Set()); setCp(false); load() }
  function tg(id){ var s=new Set(sel); s.has(id)?s.delete(id):s.add(id); setSel(s) }
  function slp(id){ lp.current=setTimeout(function(){ var s=new Set(); s.add(id); setSel(s) },500) }
  function clp(){ clearTimeout(lp.current) }
  var inSel = sel.size > 0;

  var pinnedNotes = notes.filter(function(n){return n.is_pinned});
  var unpinnedNotes = notes.filter(function(n){return !n.is_pinned});

  return (
    <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-6'>
      <div className='max-w-5xl mx-auto'>
        {/* Hero Header */}
        <div className='relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600 dark:from-violet-700 dark:via-purple-600 dark:to-indigo-700 rounded-[3.5rem] p-6 sm:p-8 mb-8 shadow-lg shadow-purple-500/20'>
          <div className='absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4' />
          <div className='absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4' />
          <div className='absolute top-1/3 right-1/3 w-3 h-3 bg-white/20 rounded-full' />
          
          <div className='relative z-10'>
            <button onClick={function(){nav('/secretary')}}
              className='mb-4 inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-[3.5rem] font-medium transition-all duration-200 border border-white/15 hover:border-white/30 text-sm'>
              <ArrowLeft size={16} />
              <span>{ru ? 'Назад к Секретарю' : 'Back to Secretary'}</span>
            </button>
            <div className='flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-2 mb-1'>
                  <Sparkles size={18} className='text-white/80' />
                  <span className='text-white/60 text-sm font-medium uppercase tracking-wider'>
                    {ru ? 'Ваши записи' : 'Your Records'}
                  </span>
                </div>
                <h1 className='text-2xl sm:text-3xl font-bold text-white'>
                  {inSel ? (ru ? 'Выбрано: ' : 'Selected: ') + sel.size : (ru ? 'Мои заметки' : 'My Notes')}
                </h1>
                <p className='text-white/70 text-sm mt-1'>
                  {notes.length} {ru ? 'заметок' : 'notes'}
                </p>
              </div>
              {!inSel && (
                <button onClick={function(){nav('/secretary/notes/new')}}
                  className='w-12 h-12 rounded-[3.5rem] bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border border-white/20 hover:border-white/40 shadow-lg'>
                  <Plus size={24} className='text-white' />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {notes.length === 0 ? (
          <div className='text-center py-16'>
            <div className='w-20 h-20 mx-auto mb-5 rounded-[3.5rem] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center'>
              <StickyNote size={36} className='text-gray-400 dark:text-gray-500' />
            </div>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-2'>
              {ru ? 'Нет заметок' : 'No notes'}
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-6'>
              {ru ? 'Нажмите + чтобы создать первую заметку' : 'Tap + to create your first note'}
            </p>
            <button onClick={function(){nav('/secretary/notes/new')}}
              className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-[3.5rem] font-medium transition-all shadow-md shadow-purple-500/20'>
              <Plus size={18} />
              {ru ? 'Создать заметку' : 'Create Note'}
            </button>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <div className='mb-6'>
                <div className='flex items-center gap-2 mb-3'>
                  <Pin size={14} className='text-amber-500' />
                  <span className='text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                    {ru ? 'Закреплённые' : 'Pinned'}
                  </span>
                </div>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
                  {pinnedNotes.map(function(n){ var s=sel.has(n.id); return (
                    <motion.div key={n.id} layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                      onMouseDown={function(){slp(n.id)}} onMouseUp={clp} onMouseLeave={clp}
                      onTouchStart={function(){slp(n.id)}} onTouchEnd={clp}
                      onClick={function(){ inSel?tg(n.id):nav('/secretary/notes/'+n.id) }}
                      className={'relative rounded-[3.5rem] p-4 shadow-sm cursor-pointer transition-all duration-200 bg-white dark:bg-gray-800/80 backdrop-blur-sm border-2 overflow-hidden hover:shadow-md '+(s?'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20':'border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600')}>
                      <div className='absolute left-0 top-0 bottom-0 w-1.5 rounded-l-full' style={{backgroundColor:n.color}} />
                      {s ? <div className='absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md'><Check size={14} className='text-white'/></div>
                         : <Pin size={12} className='absolute top-3 right-3 text-amber-500' />}
                      <h3 className='text-sm font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 pl-1'>{n.title}</h3>
                      <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-3 pl-1'>{n.content||(ru?'Пустая заметка':'Empty note')}</p>
                    </motion.div>
                  )})}
                </div>
              </div>
            )}

            {/* All notes grid */}
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
              {unpinnedNotes.map(function(n){ var s=sel.has(n.id); return (
                <motion.div key={n.id} layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                  onMouseDown={function(){slp(n.id)}} onMouseUp={clp} onMouseLeave={clp}
                  onTouchStart={function(){slp(n.id)}} onTouchEnd={clp}
                  onClick={function(){ inSel?tg(n.id):nav('/secretary/notes/'+n.id) }}
                  className={'relative rounded-[3.5rem] p-4 shadow-sm cursor-pointer transition-all duration-200 bg-white dark:bg-gray-800/80 backdrop-blur-sm border-2 overflow-hidden hover:shadow-md '+(s?'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20':'border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600')}>
                  <div className='absolute left-0 top-0 bottom-0 w-1.5 rounded-l-full' style={{backgroundColor:n.color}} />
                  {s && <div className='absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md'><Check size={14} className='text-white'/></div>}
                  <h3 className='text-sm font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 pl-1'>{n.title}</h3>
                  <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-3 pl-1'>{n.content||(ru?'Пустая заметка':'Empty note')}</p>
                </motion.div>
              )})}
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button */}
      {!inSel && notes.length > 0 && (
        <button onClick={function(){nav('/secretary/notes/new')}}
          className='fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-[3.5rem] shadow-xl shadow-purple-500/25 flex items-center justify-center active:scale-95 transition-all duration-200 z-20'>
          <Plus size={24} />
        </button>
      )}

      {/* Selection Action Bar */}
      <AnimatePresence>
        {inSel && (
          <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} transition={{ease:[0.16,1,0.3,1]}}
            className='fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto'>
            <div className='bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-xl px-2 py-2'>
              <div className='flex items-center justify-center gap-1'>
                <button onClick={bPin} className='flex items-center gap-2 px-4 py-3 rounded-[3.5rem] hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors'>
                  <Pin size={18}/> <span className='hidden sm:inline'>{ru?'Закрепить':'Pin'}</span>
                </button>
                <button onClick={function(){setCp(!cp)}} className='flex items-center gap-2 px-4 py-3 rounded-[3.5rem] hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors'>
                  <Palette size={18}/> <span className='hidden sm:inline'>{ru?'Цвет':'Color'}</span>
                </button>
                <button onClick={bDel} className='flex items-center gap-2 px-4 py-3 rounded-[3.5rem] hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 transition-colors'>
                  <Trash2 size={18}/> <span className='hidden sm:inline'>{ru?'Удалить':'Delete'}</span>
                </button>
              </div>
              <AnimatePresence>
                {cp && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1,marginTop:8}} exit={{height:0,opacity:0,marginTop:0}} className='overflow-hidden'>
                    <div className='flex items-center justify-center gap-3 pt-2 pb-1'>
                      {COLORS.map(function(c){ return <button key={c} onClick={function(){bColor(c)}} className='w-9 h-9 rounded-[3rem] shadow-md border-2 border-white dark:border-gray-700 active:scale-90 transition-transform hover:scale-110' style={{backgroundColor:c}} /> })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}