import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Pin, Trash2, Check, Palette } from 'lucide-react';
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
  return (
    <div className='flex-1 overflow-y-auto bg-background-light dark:bg-background-dark'>
      <div className='sticky top-0 z-10 px-4 py-3 flex items-center gap-3'>
        <button onClick={function(){nav('/secretary')}} className='p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center'><ArrowLeft size={20} className='text-gray-600 dark:text-gray-400'/></button>
        <h1 className='text-lg font-semibold text-gray-900 dark:text-white'>{inSel?(ru?'Выбрано: ':'Selected: ')+sel.size:(ru?'Ваши заметки':'Your Notes')}</h1>
      </div>
      <div className='px-4 py-4'>
        {notes.length===0?(
          <div className='text-center py-20 text-gray-400'><p className='text-sm'>{ru?'Нет заметок':'No notes'}</p></div>
        ):(
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
            {notes.map(function(n){ var s=sel.has(n.id); return (
              <motion.div key={n.id} layout initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                onMouseDown={function(){slp(n.id)}} onMouseUp={clp} onMouseLeave={clp}
                onTouchStart={function(){slp(n.id)}} onTouchEnd={clp}
                onClick={function(){ inSel?tg(n.id):nav('/secretary/notes/'+n.id) }}
                className={'relative rounded-[1.25rem] p-4 shadow-md cursor-pointer transition-all bg-white/40 dark:bg-gray-800/30 backdrop-blur-xl border-2 overflow-hidden '+(s?'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20':'border-white/30 dark:border-white/5')}>
                <div className='absolute left-0 top-0 bottom-0 w-1.5' style={{backgroundColor:n.color}} />
                {s?<div className='absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center'><Check size={14} className='text-white'/></div>:n.is_pinned&&<Pin size={12} className='absolute top-3 right-3 text-gray-400'/>}
                <h3 className='text-sm font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2'>{n.title}</h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-3'>{n.content||(ru?'Пустая заметка':'Empty note')}</p>
              </motion.div>
            )})}
          </div>
        )}
      </div>
      {!inSel&&<button onClick={function(){nav('/secretary/notes/new')}} className='fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-all z-20'><Plus size={26}/></button>}
      <AnimatePresence>
        {inSel&&(
          <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} transition={{ease:[0.16,1,0.3,1]}}
            className='fixed bottom-0 left-0 right-0 z-40 bg-white/60 dark:bg-gray-800/50 backdrop-blur-xl border-t border-white/20 dark:border-white/5 px-4 py-3'>
            <div className='flex items-center justify-center gap-2 max-w-lg mx-auto'>
              <button onClick={bPin} className='flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200'><Pin size={18}/> {ru?'Закрепить':'Pin'}</button>
              <button onClick={function(){setCp(!cp)}} className='flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200'><Palette size={18}/> {ru?'Цвет':'Color'}</button>
              <button onClick={bDel} className='flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600'><Trash2 size={18}/> {ru?'Удалить':'Delete'}</button>
            </div>
            <AnimatePresence>
              {cp&&(
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1,marginTop:12}} exit={{height:0,opacity:0,marginTop:0}} className='overflow-hidden'>
                  <div className='flex items-center justify-center gap-3 pt-2'>
                    {COLORS.map(function(c){ return <button key={c} onClick={function(){bColor(c)}} className='w-9 h-9 rounded-full shadow-md border-2 border-white dark:border-gray-700 active:scale-90 transition-transform' style={{backgroundColor:c}} /> })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
