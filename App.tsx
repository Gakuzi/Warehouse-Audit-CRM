

import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
// Fix: Use relative path for component import.
import AuditView from './components/AuditView';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
// Fix: Use relative path for type import.
import { Project } from './types';

function App() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoginModalOpen(false); // Close login modal on successful login
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = async () => {
        const hash = window.location.hash.replace('#/', '');
        if (hash) {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', hash)
                .single();
            if (data) {
                setSelectedProject(data);
            } else {
                console.error('Project not found:', error);
                window.location.hash = ''; // Clear hash if project not found
            }
        } else {
            setSelectedProject(null);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  const handleSelectProject = (project: Project) => {
    window.location.hash = `/${project.id}`;
  };

  const handleBackToDashboard = () => {
    window.location.hash = '';
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setIsProfileModalOpen(false);
      handleBackToDashboard();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header 
        user={user} 
        onLogin={() => setIsLoginModalOpen(true)}
        onProfile={() => setIsProfileModalOpen(true)}
        auditorId={selectedProject?.user_id}
      />
      <main className="container mx-auto p-4 md:p-6">
        {selectedProject ? (
          <AuditView 
            project={selectedProject} 
            user={user} 
            onBack={handleBackToDashboard} 
          />
        ) : (
          <Dashboard user={user} onSelectProject={handleSelectProject} />
        )}
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {user && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            onSignOut={handleSignOut}
          />
      )}
    </div>
  );
}

export default App;
