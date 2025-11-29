import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import SalesPortal from './components/SalesPortal';
import OrdersList from './components/OrdersList';
import Collections from './components/Collections';
import MeterReadingScreen from './components/MeterReadingScreen';
import PendingItemsScreen from './components/PendingItemsScreen';
import Summary from './components/Summary';
import { getDateString } from './utils';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('sales');
  const [editingOrder, setEditingOrder] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to check if salesman has already logged in today
  const hasSalesmanLoggedInToday = (name) => {
    const today = getDateString();
    const storedData = localStorage.getItem('loginTracking');
    if (storedData) {
      const { date, name: storedName } = JSON.parse(storedData);
      if (date === today && storedName === name) {
        return true;
      }
    }
    return false;
  };

  // Function to store today's login
  const storeLogin = (name) => {
    const today = getDateString();
    localStorage.setItem('loginTracking', JSON.stringify({ date: today, name }));
  };

  // Function to clear stored login
  const clearStoredLogin = () => {
    localStorage.removeItem('loginTracking');
  };

  // Check on app initialization if salesman has logged in today
  useEffect(() => {
    const checkInitialLogin = () => {
      const storedData = localStorage.getItem('loginTracking');
      if (storedData) {
        const { date, name: storedName } = JSON.parse(storedData);
        const today = getDateString();
        if (date === today && storedName) {
          // User was logged in today, set state accordingly
          setLoggedIn(true);
          setUserName(storedName);
          setUserRole('sales');
          // If on root, redirect to sales
          if (location.pathname === '/') {
            navigate('/sales');
          }
        }
      }
    };
    checkInitialLogin();
  }, []);

  const handleLogin = (nameOrEmail, role) => {
    if (role === 'sales') {
      if (hasSalesmanLoggedInToday(nameOrEmail)) {
        alert('You have already logged in today.');
        return;
      }
      setUserName(nameOrEmail);
      storeLogin(nameOrEmail);
    } else {
      setUserName(nameOrEmail);
    }
    setUserRole(role);
    setLoggedIn(true);
    navigate(role === 'admin' ? '/orders' : '/sales');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      setLoggedIn(false);
      setUserName('');
      setUserRole('sales');
      setEditingOrder(null);
      clearStoredLogin();
      navigate('/');
    }
  };

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Layout userName={userName} onLogout={handleLogout} userRole={userRole}>
      <Routes>
        <Route path="/sales" element={
          <SalesPortal
            userName={userName}
            userRole={userRole}
            editingOrder={editingOrder}
            setEditingOrder={setEditingOrder}
            onNavigate={navigate}
          />
        } />
        <Route path="/orders" element={
          <OrdersList
            userName={userName}
            userRole={userRole}
            setEditingOrder={setEditingOrder}
            onNavigate={navigate}
          />
        } />
        <Route path="/collections" element={
          <Collections userName={userName} userRole={userRole} />
        } />
        <Route path="/meter" element={
          <MeterReadingScreen userName={userName} userRole={userRole} />
        } />
        <Route path="/summary" element={
          <Summary userName={userName} userRole={userRole} />
        } />
        <Route path="/pending-items" element={
          <PendingItemsScreen userName={userName} userRole={userRole} />
        } />
        <Route path="*" element={<Navigate to={userRole === 'admin' ? "/orders" : "/sales"} replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
