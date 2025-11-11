// src/pages/UserDetails.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function UserDetails() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // form fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'male'|'female'|'non-binary'|'prefer_not_say'>('prefer_not_say');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // if not logged in, kick back to auth/home
  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // if profile already exists, send to home
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, gender, dob')
        .eq('id', user.id)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        // fill local fields (optional) and redirect to home
        setDisplayName(data.display_name ?? '');
        setUsername(data.username ?? '');
        setGender((data.gender as any) ?? 'prefer_not_say');
        setDob(data.dob ? (data.dob as string) : '');
        // user already has profile — redirect to home
        navigate('/', { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [user, navigate]);

  const validate = () => {
    setFormError('');
    if (!displayName.trim()) return setFormError('Please enter your name.');
    if (!username.trim() || username.trim().length < 3) return setFormError('Choose a username (min 3 chars).');
    // dob optional, but if provided, make sure it's a valid date in the past
    if (dob) {
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return setFormError('Invalid date of birth.');
      if (d > new Date()) return setFormError('Date of birth cannot be in the future.');
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setFormError('You must be signed in.');

    if (validate() !== true) return;
    setSaving(true);
    setFormError('');

    try {
      // check username uniqueness (other than this user)
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (existing && existing.id !== user.id) {
        setFormError('Username already taken. Pick another one.');
        setSaving(false);
        return;
      }

      const payload = {
        id: user.id, // important: the PK = auth.uid()
        display_name: displayName.trim(),
        username: username.trim(),
        gender,
        dob: dob || null,
        updated_at: new Date().toISOString()
      };

      // upsert so this works for both create and update
      const { error } = await supabase
        .from('user_profiles')
        .upsert(payload, { returning: 'minimal' });

      if (error) {
        console.error('Profile save error:', error);
        setFormError(error.message || 'An error occurred while saving your profile.');
        setSaving(false);
        return;
      }

      // success -> redirect to home
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Unexpected error');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Complete your profile</h2>
          <p className="mt-2 text-sm text-gray-600">A few details to personalize your experience</p>
        </div>

        <form className="bg-white rounded-lg shadow-md p-8 space-y-6" onSubmit={handleSubmit}>
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="unique username (min 3 chars)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="prefer_not_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex justify-center py-2 px-4 rounded-md text-white bg-gradient-to-r from-blue-600 to-green-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
