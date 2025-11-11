// src/components/Layout.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Home, 
  BookOpen, 
  Heart, 
  Users, 
  LogOut,
  Menu,
  X,
  Sparkles,
  User, // Generic user icon for the dropdown trigger
  UserCircle // Icon for the "Profile" link inside the dropdown
} from 'lucide-react';
import { supabase } from '../lib/supabase';// Adjust path if needed

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // <-- Add this

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('avatar')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Supabase error:', error.message);
      }
      if (data?.avatar) {
        setAvatarUrl(data.avatar);
      }
    };
    fetchAvatar();
  }, [user, location.pathname]); // <-- add location.pathname

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Diary', href: '/diary', icon: BookOpen },
    { name: 'AI Chat', href: '/ai-chat', icon: Sparkles },
    { name: 'Relaxation', href: '/relaxation', icon: Heart },
    { name: 'Community', href: '/community', icon: Users },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const profileMenuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-green-50">
      <nav className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16"> {/* was h-16 */}
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Soul Sync
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex flex-grow items-center justify-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-inner'
                        //? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Profile Dropdown Section */}
            <div className="hidden md:flex items-center">
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-green-500 rounded-full text-white shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <img
                    src={avatarUrl || 'https://i.pravatar.cc/300'}
                    alt="Profile Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 origin-top-right transition-all duration-200 ease-out transform opacity-100 scale-100">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="font-semibold text-gray-800 truncate">
                          {user?.email}
                        </p>
                        <p className="text-sm text-gray-500">Your personal wellness space</p>
                      </div>
                      <div className="mt-2 space-y-1">
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <UserCircle className="w-5 h-5 mr-3 text-gray-500" />
                          Profile
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-5 h-5 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 hover:text-blue-600 p-2">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${location.pathname === item.href ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
               <div className="border-t border-gray-200 my-2"></div>
               <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100"
              >
                <UserCircle className="w-5 h-5" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}