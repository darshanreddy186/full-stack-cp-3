// src/pages/EditAvatar.tsx

import React, { useState , useEffect} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const pixelAvatars = [
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958403/memo_35_ixu6ha.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958402/memo_34_qukkvw.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958401/memo_16_k90fbe.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958401/memo_3_g3xbet.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958401/memo_31_uv1sdx.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958401/memo_25_vvqw0r.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958401/memo_17_hbfrz5.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958400/memo_2_omnjpb.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958402/vibrent_1_ehomez.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958402/upstream_21_a7lv3f.png', 
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958403/vibrent_3_zjvwpa.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958401/upstream_20_dfrt2l.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958400/toon_6_tflm6c.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958400/toon_5_e7ryae.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958400/notion_14_ykugvz.png',
    'https://res.cloudinary.com/dhemfvxnm/image/upload/v1757958402/notion_6_tzsj3h.png',
];

export function EditAvatar() {
  const navigate = useNavigate();
   const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('avatar')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching avatar:', error.message);
        return;
      }
      if (data && data.avatar) {
        setSelectedAvatar(data.avatar);
        setPreviewAvatar(data.avatar);
      }
    };
    fetchAvatar();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from('user_profiles')
      .update({ avatar: previewAvatar })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      console.error('Error updating avatar:', error.message);
      return;
    }

    setSelectedAvatar(previewAvatar);
    navigate('/profile', { state: { avatarSaved: true } });
  };
  
  return (
    <>
      <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-2xl relative min-h-[70vh] flex flex-col">
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Go Back</span>
        </button>

        <div className="flex-grow flex items-center justify-center">
          <img 
            src={previewAvatar || 'https://i.pravatar.cc/300'} 
            alt="Avatar Preview"
            className="w-64 h-64 rounded-full object-cover shadow-lg border-4 border-gray-700"
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 mt-8">
          <div className="flex overflow-x-auto space-x-4 pb-4">
            {pixelAvatars.map((avatar, index) => (
              <button key={index} onClick={() => setPreviewAvatar(avatar)} className="flex-shrink-0">
                <img 
                  src={avatar} 
                  alt={`Avatar option ${index + 1}`}
                  className={`w-20 h-20 rounded-lg transition-all duration-200 ${previewAvatar === avatar ? 'border-4 border-blue-500 scale-110' : 'border-2 border-transparent hover:border-blue-400'}`}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-end space-x-4 mt-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              ) : null}
              Save
            </button>
          </div>
        </div>
        {showSuccess && (
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            Avatar saved successfully!
          </div>
        )}
      </div>
    </>
  );
}