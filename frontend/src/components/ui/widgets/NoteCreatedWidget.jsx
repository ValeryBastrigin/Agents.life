import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, StickyNote } from 'lucide-react';

const NoteCreatedWidget = ({ data }) => {
  const { title, content_preview } = data;

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: { delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }
    }
  };

  const detailVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { delay: 0.3, duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-violet-200/50 dark:border-violet-700/30">
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            variants={iconVariants}
            className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600"
          >
            <CheckCircle className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
            Заметка создана
          </span>
        </div>

        {/* Note Details */}
        <motion.div
          variants={detailVariants}
          className="flex items-start gap-4"
        >
          <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-900/40">
            <StickyNote className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {title}
            </h4>
            {content_preview && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {content_preview}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default NoteCreatedWidget;