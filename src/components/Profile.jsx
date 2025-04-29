import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Particles } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import './Profile.css';

const Profile = ({ user, theme, db }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const particlesOptions = {
    particles: {
      number: { value: 30, density: { enable: true, value_area: 800 } },
      color: { value: theme === 'dark' ? '#ff69b4' : '#ff0066' },
      shape: { type: 'circle' },
      opacity: { value: 0.5, random: true },
      size: { value: 3, random: true },
      move: { enable: true, speed: 1, direction: 'none', random: true },
    },
    interactivity: {
      events: { onHover: { enable: true, mode: 'repulse' }, onClick: { enable: true, mode: 'push' } },
      modes: { repulse: { distance: 100 }, push: { quantity: 4 } },
    },
  };

  const fetchProfile = useCallback(async () => {
    if (user === null) return;
    if (!user || !user.uid) {
      setError(t('no_user_logged_in'));
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPhone(data.phone || '');
        setPlayerName(data.playerName || 'Not set');
      } else {
        setPhone('');
        setPlayerName('Not set');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(t('profile_fetch_error', { message: err.message }));
    } finally {
      setLoading(false);
    }
  }, [user, db, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const debounce = (func, delay) => {
    let timeout;
    return (value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(value), delay);
    };
  };

  const handlePhoneChange = debounce(setPhone, 300);
  const handlePlayerNameChange = debounce(setPlayerName, 300);

  const handleSave = useCallback(async () => {
    if (!user || !user.uid) {
      setError(t('no_user_logged_in'));
      return;
    }

    setSaving(true);
    const userData = {
      phone,
      playerName,
      displayName: user.displayName || user.email.split('@')[0],
      email: user.email,
    };
    setIsEditing(false);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userData, { merge: true });
      alert(t('profile_updated'));
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(t('profile_save_failed', { message: err.message }));
      setIsEditing(true);
    } finally {
      setSaving(false);
    }
  }, [user, phone, playerName, t, db]);

  if (loading) return <div className="loading">{t('loading_profile')}</div>;

  if (error) return (
    <div className="error" data-theme={theme}>
      <Particles id="profile-particles" init={particlesInit} options={particlesOptions} className="particles" />
      <div className="error-card">
        <h2>{t('error')}</h2>
        <p>{error}</p>
        <div className="error-buttons">
          <button onClick={() => { setError(null); setLoading(true); fetchProfile(); }} className="retry-button">
            {t('retry')}
          </button>
          <Link to="/" className="back-link" aria-label={t('back_to_home')}>{t('back_to_home')}</Link>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="profile" data-theme={theme}>
        <Particles id="profile-particles" init={particlesInit} options={particlesOptions} className="particles" />
        <div className="profile-card">
          <h2>{t('profile')}</h2>
          <p>{t('please_login')}</p>
          <Link to="/" className="back-link" aria-label={t('back_to_home')}>{t('back_to_home')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile" data-theme={theme}>
      <Particles id="profile-particles" init={particlesInit} options={particlesOptions} className="particles" />
      <div className="profile-card">
        <h2>{t('profile')}</h2>
        {isEditing ? (
          <>
            <p className="profile-info">{t('username')}: {user.displayName || user.email.split('@')[0]}</p>
            <p className="profile-info">Email: {user.email}</p>
            <input
              type="tel"
              defaultValue={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder={t('phone_placeholder')}
              aria-label={t('phone_label')}
              disabled={saving}
              className="profile-input"
            />
            <input
              type="text"
              defaultValue={playerName}
              onChange={(e) => handlePlayerNameChange(e.target.value)}
              placeholder={t('player_name')}
              aria-label={t('player_name')}
              disabled={saving}
              className="profile-input"
            />
            <div className="form-buttons">
              <button
                onClick={handleSave}
                aria-label={t('save_profile_changes')}
                disabled={saving}
                className="save-button"
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                aria-label={t('cancel_profile_changes')}
                disabled={saving}
                className="cancel-button"
              >
                {t('cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="profile-info">{t('username')}: {user.displayName || user.email.split('@')[0]}</p>
            <p className="profile-info">Email: {user.email}</p>
            <p className="profile-info">{t('phone_label')}: {phone || 'Not set'}</p>
            <p className="profile-info">{t('player_name')}: {playerName}</p>
            <button
              onClick={() => setIsEditing(true)}
              aria-label={t('edit_profile')}
              className="edit-button"
            >
              {t('edit_profile')}
            </button>
          </>
        )}
        <Link to="/" className="back-link" aria-label={t('back_to_home')}>{t('back_to_home')}</Link>
      </div>
    </div>
  );
};

export default Profile;