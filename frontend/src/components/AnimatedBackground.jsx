import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground = ({ theme, isLoading }) => {
  // 5 цветов агентов, которые переливаются на фоне чата
  const darkColors = [
    'rgba(37, 99, 235, 0.25)',    // Secretary — синий
    'rgba(22, 163, 74, 0.25)',    // Dietitian — зеленый
    'rgba(219, 39, 119, 0.25)',   // Psychologist — розовый
    'rgba(147, 51, 234, 0.25)',   // Accountant — фиолетовый
    'rgba(217, 119, 6, 0.3)',     // Mentor — янтарный
  ];

  const lightColors = [
    'rgba(191, 219, 254, 0.35)',   // Secretary light
    'rgba(187, 247, 208, 0.35)',   // Dietitian light
    'rgba(252, 231, 243, 0.35)',   // Psychologist light
    'rgba(243, 232, 255, 0.35)',   // Accountant light
    'rgba(254, 243, 199, 0.4)',    // Mentor light
  ];

  const colors = theme === 'dark' ? darkColors : lightColors;

  // 5 blobs с разными размерами, позициями и скоростями для плавного переливания
  const blobs = [
    {
      id: 1,
      color: colors[0],
      size: theme === 'dark' ? 400 : 350,
      initial: { x: '-20%', y: '-10%', scale: 1, rotate: 0 },
      animate: {
        x: '25%',
        y: '15%',
        scale: 1.2,
        rotate: 90,
      },
      transition: {
        duration: isLoading ? 4 : 14,
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
        x: '45%',
        y: '55%',
        scale: 0.8,
        rotate: -90,
      },
      transition: {
        duration: isLoading ? 4.5 : 16,
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
        x: '55%',
        y: '35%',
        scale: 1.3,
        rotate: 120,
      },
      transition: {
        duration: isLoading ? 5 : 15,
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
        x: '35%',
        y: '45%',
        scale: 0.9,
        rotate: -120,
      },
      transition: {
        duration: isLoading ? 5.5 : 18,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      },
    },
    {
      id: 5,
      color: colors[4],
      size: theme === 'dark' ? 320 : 270,
      initial: { x: '10%', y: '50%', scale: 1, rotate: 0 },
      animate: {
        x: '65%',
        y: '20%',
        scale: 1.1,
        rotate: 60,
      },
      transition: {
        duration: isLoading ? 4.5 : 15.5,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      },
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {blobs.map((blob) => (
        <motion.div
          key={blob.id}
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            filter: theme === 'dark' ? 'blur(48px)' : 'blur(32px)',
          }}
          initial={blob.initial}
          animate={blob.animate}
          transition={blob.transition}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground;