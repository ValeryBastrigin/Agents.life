import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserIdState] = useState(() => {
    const saved = localStorage.getItem('user_id');
    return saved ? parseInt(saved) : null;
  });
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('user_id') !== null && localStorage.getItem('user_id') !== 'null';
  });

  const updateUserId = (newUserId) => {
    setUserIdState(newUserId);
    localStorage.setItem('user_id', newUserId);
    setIsAuthenticated(newUserId > 1);
  };

  const clearUser = () => {
    setUserIdState(null);
    localStorage.removeItem('user_id');
    setUserProfile(null);
    setIsAuthenticated(false);
  };

  return (
    <UserContext.Provider value={{ userId, setUserId: updateUserId, userProfile, setUserProfile, clearUser, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
