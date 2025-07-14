import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ChannelGrid from './components/Channel/ChannelGrid';
import ChannelPlayer from './components/Channel/ChannelPlayer';
import AdminDashboard from './components/Admin/AdminDashboard';
import { Channel } from './types';

const MainApp: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: appState, setCurrentChannel } = useApp();
  const [currentView, setCurrentView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  if (!authState.user) {
    return <LoginForm onToggleMode={() => setIsRegister(!isRegister)} isRegister={isRegister} />;
  }

  const handleChannelSelect = (channel: Channel) => {
    setCurrentChannel(channel);
  };

  const handleClosePlayer = () => {
    setCurrentChannel(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'admin':
        return <AdminDashboard />;
      case 'channels':
      case 'home':
      default:
        return (
          <ChannelGrid
            channels={appState.channels}
            onChannelSelect={handleChannelSelect}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Channel Player Modal */}
      {appState.currentChannel && (
        <ChannelPlayer
          channel={appState.currentChannel}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <MainApp />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;