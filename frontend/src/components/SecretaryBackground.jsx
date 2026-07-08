import React from 'react';
import { motion } from 'framer-motion';

const SecretaryBackground = ({ theme }) => {
  // Blue theme colors for Secretary (Time Manager)
  const darkColors = [
    'rgba(37, 99, 235, 0.3)',   // blue-600
    'rgba(59, 130, 246, 0.25)',  // blue-500
    'rgba(96, 165, 250, 0.2)',   // blue-400
    'rgba(147, 197, 253, 0.25)', // blue-300
  ];

  const lightColors = [
    'rgba(191, 219, 254, 0.4)',  // light blue-300
    'rgba(147, 197, 253, 0.35)', // light blue-400
    'rgba(96, 165, 250, 0.3)',   // light blue-500
    'rgba(59, 130, 246, 0.35)',  // light blue-600
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

export default SecretaryBackground;