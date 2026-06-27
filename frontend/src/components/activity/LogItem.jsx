import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, ChevronDown, Calendar, Bell, MessageSquare, FileText, Clock } from 'lucide-react';

const CLR = {
  calendar: { bg: 'from-blue-500/20 to-blue-600/10', bd: 'border-blue-400/40', ib: 'bg-blue-500/25', ic: 'text-blue-500', ln: 'bg-blue-400/40', lb: 'Calendar' },
  task:     { bg: 'from-yellow-500/20 to-amber-600/10', bd: 'border-yellow-400/40', ib: 'bg-yellow-500/25', ic: 'text-yellow-500', ln: 'bg-yellow-400/40', lb: 'Task' },
  note:     { bg: 'from-purple-500/20 to-purple-600/10', bd: 'border-purple-400/40', ib: 'bg-purple-500/25', ic: 'text-purple-500', ln: 'bg-purple-400/40', lb: 'Note' },
  chat:     { bg: 'from-gray-500/20 to-gray-600/10', bd: 'border-gray-400/40', ib: 'bg-gray-500/25', ic: 'text-gray-500', ln: 'bg-gray-400/40', lb: 'Chat' },
};

const SI = { success: CheckCircle2, processing: Loader2, error: XCircle, completed: CheckCircle2 };
const SC = { success: 'text-emerald-500', processing: 'text-amber-500', error: 'text-red-500', completed: 'text-emerald-500' };
const TI = { calendar: Calendar, task: Bell, note: FileText, chat: MessageSquare };

function rel(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 10) return 'just now'; if (s < 60) return s + 's'; if (s < 3600) return Math.floor(s/60) + 'm';
  if (s < 86400) return Math.floor(s/3600) + 'h'; if (s < 604800) return Math.floor(s/86400) + 'd';
  return new Date(ts).toLocaleDateString();
}

function Badge({ s }) {
  const m = { success: 'bg-emerald-500/15 text-emerald-500 border-emerald-400/30', completed: 'bg-emerald-500/15 text-emerald-500 border-emerald-400/30', error: 'bg-red-500/15 text-red-500 border-red-400/30', processing: 'bg-amber-500/15 text-amber-500 border-amber-400/30' };
  const l = { success: 'OK', completed: 'Done', error: 'Fail', processing: '...' };
  return <span className={'text-[11px] px-2 py-0.5 rounded-full border ' + (m[s]||m.success)}>{l[s]||s}</span>;
}

export default function LogItem({ entry, isLast, index }) {
  const [open, setOpen] = useState(false);
  const c = CLR[entry.action_type] || CLR.chat;
  const SIcon = SI[entry.status] || CheckCircle2;
  const AIcon = TI[entry.action_type] || MessageSquare;
  const sc = SC[entry.status] || SC.success;
  const bz = entry.status === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-3 sm:gap-4"
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center pt-1">
        <div className={'relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg border-2 ' + c.ib + ' ' + c.bd + (bz?' animate-pulse':'')}>
          {bz ? <Loader2 size={22} className={c.ic + ' animate-spin'} /> : <AIcon size={20} className={c.ic} />}
        </div>
        {!isLast && <div className={'w-0.5 flex-1 min-h-[24px] bg-gradient-to-b ' + c.ln} />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-5">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={'relative rounded-[1.25rem] p-3 sm:p-4 bg-white/80 dark:bg-gray-800/50 bg-gradient-to-br ' + c.bg + ' border ' + c.bd + ' shadow-md cursor-pointer'}
          onClick={() => setOpen(!open)}
        >
          <div className="absolute -top-2 -right-1 sm:-right-2">
            <SIcon size={22} className={sc + (bz?' animate-spin':'') + ' drop-shadow-md'} />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white leading-snug pr-6">{entry.title}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><Clock size={12}/>{rel(entry.timestamp)}</span>
                <span className={'text-[10px] px-2 py-0.5 rounded-full border ' + c.ib + ' ' + c.ic + ' ' + c.bd}>{c.lb}</span>
                <Badge s={entry.status} />
              </div>
            </div>
            <motion.div animate={{ rotate: open ? 180 : 0 }} className="text-gray-400 mt-1 flex-shrink-0 p-1 -m-1">
              <ChevronDown size={18} />
            </motion.div>
          </div>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                <div className="bg-black/20 dark:bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Payload</p>
                  <pre className="text-xs text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
