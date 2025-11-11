// src/pages/Profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Edit2, Loader2, Save, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MemoriesSlideshow } from '../components/MemoriesSlideshow';
import { useAuth } from '../hooks/useAuth';

// Define the shape of your memory data
interface Memory {
  id: string;
  image_url: string;
  context: string;
  mood: string;
}

// Define the shape of your profile data, matching your schema
interface UserProfile {
  id: string;
  display_name: string | null;
  age_range: string | null;
  preferred_activities: string[] | null;
  wellness_goals: string[] | null;
  avatar: string;
  username: string | null;
  gender: string | null;
  dob: string | null; // Date is a string in this format 'YYYY-MM-DD'
  favorite_color: string | null; // Added based on your request
}

const CircularProgressBar = ({ percentage }: { percentage: number }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full">
                <circle
                    className="text-gray-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50%"
                    cy="50%"
                />
                <circle
                    className="text-green-500"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50%"
                    cy="50%"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    transform="rotate(-90 64 64)"
                />
            </svg>
            <span className="absolute text-3xl font-bold text-green-600">{`${Math.round(percentage)}%`}</span>
        </div>
    );
};

const ProfileField = ({ label, value }: { label: string, value: string | null | undefined }) => (
    <div>
        <label className="text-sm font-medium text-gray-500">{label}</label>
        <div className="mt-1 p-3 bg-gray-100 rounded-lg border border-gray-200 min-h-[48px] flex items-center">
            <p className="text-gray-800">{value || 'Not set'}</p>
        </div>
    </div>
);

export function Profile() {
    const location = useLocation();
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});

    const [memories, setMemories] = useState<Memory[]>([]);
    const [showMemories, setShowMemories] = useState(false);
    const [loadingMemories, setLoadingMemories] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const calculateKnowledgePercentage = useCallback(() => {
        if (!profile) return 0;
        let knownFields = 0;
        if (profile.dob) knownFields++;
        if (profile.favorite_color) knownFields++;
        return (knownFields / 2) * 100;
    }, [profile]);

    const fetchProfile = useCallback(async () => {
        if (!user) return;

        try {
            setLoadingProfile(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            if (data) {
                setProfile(data);
                setFormData(data);
            }
        } catch (err: any) {
            setError("Could not fetch profile data.");
            console.error('Error fetching profile:', err.message);
        } finally {
            setLoadingProfile(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (location.state?.avatarSaved) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    }, [location.state]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async () => {
        if (!user) return;
        try {
            setLoadingProfile(true);
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    display_name: formData.display_name,
                    dob: formData.dob,
                    favorite_color: formData.favorite_color,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;
            
            // Refetch profile to show updated data
            await fetchProfile();
            setEditMode(false);
        } catch (err: any) {
            setError("Failed to update profile.");
            console.error('Error updating profile:', err.message);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleShowMemories = async () => {
        if (!user) {
            setError("You must be logged in to see memories.");
            return;
        }

        setLoadingMemories(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('memories')
                .select('id, image_url, context, mood,created_at')
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            if (data) {
                if (data.length === 0) {
                    setError("You haven't saved any memories yet.");
                } else {
                    setMemories(data);
                    setShowMemories(true);
                }
            }
        } catch (err: any) {
            setError("Could not fetch memories. Please try again later.");
            console.error('Error fetching memories:', err.message);
        } finally {
            setLoadingMemories(false);
        }
    };

    if (loadingProfile && !profile) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 flex flex-col items-center text-center">
                    <img
                        src={profile?.avatar || 'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958403/memo_35_ixu6ha.png'}
                        alt="User Avatar"
                        className="w-48 h-48 rounded-full object-cover shadow-2xl mb-4 border-4 border-white"
                    />
                    <Link
                        to="/profile/edit-avatar"
                        className="flex items-center space-x-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Avatar</span>
                    </Link>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="flex justify-between items-start">
                        {editMode ? (
                             <input
                                type="text"
                                name="display_name"
                                value={formData.display_name || ''}
                                onChange={handleInputChange}
                                className="text-4xl font-bold text-gray-800 border-b-2 border-green-400 focus:outline-none w-full"
                                placeholder="Your Name"
                            />
                        ) : (
                             <h1 className="text-4xl font-bold text-gray-800 border-b-2 border-green-400 pb-2">
                                {profile?.display_name || 'Anonymous User'}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-700">Your assistant knows you</h2>
                            <p className="text-sm text-gray-500">The more you interact, the better it gets!</p>
                        </div>
                        <CircularProgressBar percentage={calculateKnowledgePercentage()} />
                    </div>

                    {editMode ? (
                        <div className="space-y-4">
                             <div>
                                <label className="text-sm font-medium text-gray-500">Date of birth</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 p-3 bg-gray-100 rounded-lg border border-gray-200 w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Favourite color</label>
                                <input
                                    type="text"
                                    name="favorite_color"
                                    value={formData.favorite_color || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 p-3 bg-gray-100 rounded-lg border border-gray-200 w-full"
                                    placeholder="e.g., Blue"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <ProfileField label="Date of birth" value={profile?.dob} />
                            <ProfileField label="Favourite color" value={profile?.favorite_color} />
                        </div>
                    )}

                    <div className="flex items-center space-x-4 mt-4">
                        {editMode ? (
                            <>
                                <button onClick={handleUpdateProfile} disabled={loadingProfile} className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                    {loadingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                    Save
                                </button>
                                <button onClick={() => setEditMode(false)} className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <Edit2 className="w-5 h-5 mr-2" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                    
                    <hr />

                    <div>
                        <h3 className="text-md font-semibold text-gray-600">Saved Memories</h3>
                        <button onClick={handleShowMemories} className="text-blue-600 hover:underline disabled:text-gray-400" disabled={loadingMemories}>
                            {loadingMemories ? (
                                <div className="flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </div>
                            ) : (
                                "Take a look"
                            )}
                        </button>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>
            </div>

            {showMemories && (
                <MemoriesSlideshow
                    memories={memories}
                    onClose={() => setShowMemories(false)}
                />
            )}
            {showSuccess && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                    Avatar saved successfully!
                </div>
            )}
        </div>
    );
}