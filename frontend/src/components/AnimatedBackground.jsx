import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground = ({ theme, isLoading }) => {
  // Dark theme colors - deep black with glowing purple/cyan/electric blue
  const darkColors = [
    'rgba(147, 51, 234, 0.3)',   // purple
    'rgba(6, 182, 212, 0.25)',   // cyan
    'rgba(59, 130, 246, 0.2)',   // electric blue
    'rgba(168, 85, 247, 0.25)',  // violet
  ];

  // Light theme colors - soft pastels on white
  const lightColors = [
    'rgba(196, 181, 253, 0.4)',  // light purple
    'rgba(165, 243, 252, 0.35)', // light cyan
    'rgba(191, 219, 254, 0.3)',  // light blue
    'rgba(216, 180, 254, 0.35)', // light violet
  ];

  const colors = theme === 'dark' ? darkColors : lightColors;

  // Blob configurations - organic shapes with different sizes and positions
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
        duration: isLoading ? 8 : 30,
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
        duration: isLoading ? 9 : 35,
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
        duration: isLoading ? 10 : 32,
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
        duration: isLoading ? 11 : 38,
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

export default AnimatedBackground;
