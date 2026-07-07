import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Sparkles, StickyNote } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
var API='http://localhost:8001/api'; var uid=1;

export default function NoteEditor() {
  var { language } = useLanguage(); var nav = useNavigate(); var { id } = useParams(); var ru=language==='ru';
  var [title,setTitle]=useState(''); var [content,setContent]=useState('');
  var isNew = !id || id==='new';

  useEffect(function(){
    if(!isNew){ axios.get(API+'/notes/'+uid).then(function(r){ var n=r.data.find(function(x){return x.id===parseInt(id)}); if(n){setTitle(n.title);setContent(n.content)} }) }
  },[id,isNew]);

  async function save(){
    if(!title.trim()) return;
    var data={title:title.trim(),content:content.trim()};
    if(isNew){ await axios.post(API+'/notes/'+uid,data) }
    else { await axios.put(API+'/notes/'+id,data) }
    nav('/secretary/notes');
  }

  return (
    <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-6'>
      <div className='max-w-2xl mx-auto'>
        {/* Hero Header — синий фирменный */}
        <div className='bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-[3rem] p-5 mb-6 text-white'>
          <button onClick={function(){nav('/secretary/notes')}}
            className='inline-flex items-center gap-2 text-white/80 hover:text-white text-base font-medium transition-colors mb-3'>
            <ArrowLeft size={22} />
            <span>{ru ? 'Заметки' : 'Notes'}</span>
          </button>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className='text-xl font-bold text-white'>
              {isNew ? (ru ? 'Новая заметка' : 'New Note') : (ru ? 'Редактировать' : 'Edit Note')}
            </h1>
          </motion.div>
        </div>

        {/* Editor Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className='bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm'>
          {/* Icon */}
          <div className='flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700/50'>
            <div className='w-10 h-10 rounded-[3rem] bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center'>
              <StickyNote size={20} className='text-violet-600 dark:text-violet-400' />
            </div>
            <div>
              <p className='text-sm font-medium text-gray-800 dark:text-white'>
                {ru ? 'Заголовок и содержание' : 'Title & Content'}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {ru ? 'Заполните оба поля для сохранения' : 'Fill in both fields to save'}
              </p>
            </div>
          </div>

          {/* Title Input */}
          <input value={title} onChange={function(e){setTitle(e.target.value)}}
            placeholder={ru ? 'Заголовок заметки' : 'Note title'}
            className='w-full text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-5'
            autoFocus />

          {/* Content Textarea */}
          <textarea value={content} onChange={function(e){setContent(e.target.value)}}
            placeholder={ru ? 'Содержимое заметки...' : 'Note content...'}
            className='w-full min-h-[50vh] text-sm text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none resize-none placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed' />
        </motion.div>

        {/* Bottom Save Button (mobile convenience) */}
        <div className='fixed bottom-6 right-6 z-20 sm:hidden'>
          <button onClick={save} disabled={!title.trim()}
            className='w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-[3.5rem] shadow-xl shadow-purple-500/25 flex items-center justify-center active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'>
            <Check size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}