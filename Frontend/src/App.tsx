// src/App.tsx
import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { WorldProvider } from './context/WorldContext';
import { Canvas } from './three/Canvas';
import { HUD } from './components/HUD';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { useWorld } from './context/WorldContext';
import { LoadingScreen } from './components/LoadingScreen';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { loadHabits, isLoaded } = useWorld();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadHabits();
    }
  }, [isAuthenticated, loadHabits]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Canvas />
      
      {isAuthenticated && !authLoading && (
        <>
          <HUD />
          {!isLoaded && <LoadingScreen />}
        </>
      )}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid #2d3748',
          },
          success: {
            iconTheme: {
              primary: '#00FF9D',
              secondary: '#1a1a2e',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF4D6D',
              secondary: '#1a1a2e',
            },
          },
        }}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <WorldProvider>
        <AppContent />
      </WorldProvider>
    </AuthProvider>
  );
};

export default App;