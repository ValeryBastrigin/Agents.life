import React from 'react';
import { motion } from 'framer-motion';

import { useState, useEffect } from 'react';

const MentorBackground = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Yellow/amber theme colors for Mentor
  const darkColors = [
    'rgba(217, 119, 6, 0.35)',    // amber-600
    'rgba(245, 158, 11, 0.3)',    // amber-500
    'rgba(251, 191, 36, 0.25)',   // amber-400
    'rgba(252, 211, 77, 0.3)',    // amber-300
  ];

  const lightColors = [
    'rgba(254, 243, 199, 0.45)',   // light amber-100
    'rgba(252, 211, 77, 0.35)',    // light amber-300
    'rgba(251, 191, 36, 0.3)',     // light amber-400
    'rgba(245, 158, 11, 0.35)',    // light amber-500
  ];

  const colors = theme === 'dark' ? darkColors : lightColors;

  const blobs = [
    {
      id: 1,
      color: colors[0],
      size: theme === 'dark' ? 400 : 350,
      initial: { x: '-20%', y: '-10%', scale: 1, rotate: 0 },
      animate: {
        x: '20%',
        y: '10%',
        scale: 1.2,
        rotate: 90,
      },
      transition: {
        duration: 30,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      },
    },
    {
      id: 2,
      color: colors[1],
      size: theme === 'dark' ? 350 : 300,
      initial: { x: '80%', y: '20%', scale: 1, rotate: 0 },
      animate: {
        x: '40%',
        y: '60%',
        scale: 0.8,
        rotate: -90,
      },
      transition: {
        duration: 35,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      },
    },
    {
      id: 3,
      color: colors[2],
      size: theme === 'dark' ? 300 : 250,
      initial: { x: '30%', y: '80%', scale: 1, rotate: 0 },
      animate: {
        x: '50%',
        y: '40%',
        scale: 1.3,
        rotate: 120,
      },
      transition: {
        duration: 32,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      },
    },
    {
      id: 4,
      color: colors[3],
      size: theme === 'dark' ? 280 : 230,
      initial: { x: '70%', y: '70%', scale: 1, rotate: 0 },
      animate: {
        x: '40%',
        y: '50%',
        scale: 0.9,
        rotate: -120,
      },
      transition: {
        duration: 38,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      },
    },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {blobs.map((blob) => (
        <motion.div
          key={blob.id}
          className="absolute rounded-full blur-3xl"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            filter: theme === 'dark' ? 'blur(80px)' : 'blur(60px)',
          }}
          initial={blob.initial}
          animate={blob.animate}
          transition={blob.transition}
        />
      ))}
    </div>
  );
};

export default MentorBackground;