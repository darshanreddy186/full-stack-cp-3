// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Home } from './pages/Home';
import { Diary } from './pages/Diary';
import { AIChat } from './pages/ai-chat';
import { Relaxation } from './pages/Relaxation';
import { Community } from './pages/Community';
import { Profile } from './pages/Profile';
import { EditAvatar } from './pages/EditAvatar';
import { UserDetails } from './pages/UserDetails';
import { supabase } from './lib/supabase';
import { StoryDetail } from './pages/StoryDetails';

function ProfileChecker({ user }: { user: any }) {
  // must be rendered inside Router to use useNavigate
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      // maybeSingle avoids throwing if no row exists
      const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!data) {
        // no profile yet -> send them to details page
        navigate('/user-details', { replace: true });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  return null;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      {/* ProfileChecker will redirect first-time users to /user-details */}
      <ProfileChecker user={user} />

      <Routes>
        {/* public route for collecting profile right after auth */}
        <Route path="/user-details" element={<UserDetails />} />

        {/* main app layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="diary" element={<Diary />} />
          <Route path="relaxation" element={<Relaxation />} />
          <Route path="/story/:storyId" element={<StoryDetail />} />
          <Route path="ai-chat" element={<AIChat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/edit-avatar" element={<EditAvatar />} />
          <Route path="community" element={<Community />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
