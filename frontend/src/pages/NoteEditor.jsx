import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
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
    <div className='flex-1 overflow-y-auto bg-background-light dark:bg-background-dark'>
      <div className='sticky top-0 z-10 px-4 py-3 flex items-center justify-between'>
        <button onClick={function(){nav('/secretary/notes')}} className='p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center'><ArrowLeft size={20} className='text-gray-600 dark:text-gray-400'/></button>
        <button onClick={save} disabled={!title.trim()} className='p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-30'><Check size={20} className='text-green-500'/></button>
      </div>
      <div className='px-4 py-4 max-w-lg mx-auto'>
        <input value={title} onChange={function(e){setTitle(e.target.value)}} placeholder={ru?'Заголовок':'Title'} className='w-full text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-4' autoFocus />
        <textarea value={content} onChange={function(e){setContent(e.target.value)}} placeholder={ru?'Содержимое...':'Content...'} className='w-full min-h-[50vh] text-sm text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none resize-none placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed' />
      </div>
    </div>
  );
}
