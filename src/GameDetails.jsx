import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, onAuthStateChanged } from './firebase';
import { useTranslation } from 'react-i18next';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import './GameDetails.css';

function GameDetails({ theme }) {
  const { t } = useTranslation();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [user, setUser] = useState(null);
  const [updatingNotes, setUpdatingNotes] = useState(false);
  const [userPlayerName, setUserPlayerName] = useState('Not set');
  const [joining, setJoining] = useState(false);
  const [joinedGame, setJoinedGame] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          const gameData = { id: gameDoc.id, ...gameDoc.data() };
          const players = gameData.players || [];
          const usersData = {};
          for (const playerUid of players) {
            if (playerUid && typeof playerUid === 'string') {
              const userDoc = await getDoc(doc(db, 'users', playerUid));
              usersData[playerUid] = userDoc.exists()
                ? { playerName: userDoc.data().playerName || 'Not set' }
                : { playerName: 'Unknown Player' };
            }
          }
          gameData.players = players.map((playerUid) =>
            usersData[playerUid]?.playerName || 'Unknown Player'
          );
          setGame(gameData);
          setNotes(gameData.notes || '');
        } else {
          setGame(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching game:', err);
        toast.error(t('failed_to_load_game'), { position: 'top-right' });
        setLoading(false);
      }
    };
    fetchGame();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserPlayerName(userData.playerName || 'Not set');
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, t]);

  const handleJoin = async () => {
    if (!user) {
      toast.error(t('please_login_to_join'), { position: 'top-right' });
      return;
    }
    const maxPlayers = game.maxPlayers || 10;
    if ((game.players || []).length >= maxPlayers) {
      toast.error(t('game_full'), { position: 'top-right' });
      return;
    }
    setJoining(true);
    try {
      const gameRef = doc(db, 'games', gameId);
      const updatedPlayers = game.players || [];
      if (!updatedPlayers.includes(user.uid)) {
        updatedPlayers.push(user.uid);
        await updateDoc(gameRef, { players: updatedPlayers });
        setGame({ ...game, players: updatedPlayers });
        setJoinedGame(true);
        toast.success(`${userPlayerName} ${t('joined_game')}`, { position: 'top-right' });
      }
    } catch (err) {
      toast.error(t('failed_to_join'), { position: 'top-right' });
      console.error('Join game error:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    try {
      const gameRef = doc(db, 'games', gameId);
      const updatedPlayers = (game.players || []).filter(player => player !== user.uid);
      await updateDoc(gameRef, { players: updatedPlayers });
      setGame({ ...game, players: updatedPlayers });
      setJoinedGame(false);
      toast.success(t('left_game'), { position: 'top-right' });
    } catch (err) {
      toast.error(t('failed_to_leave'), { position: 'top-right' });
      console.error('Leave game error:', err);
    }
  };

  const handleUpdateNotes = async (e) => {
    e.preventDefault();
    if (!user || game.creator !== user.email) {
      toast.error(t('only_creator_can_update_notes'), { position: 'top-right' });
      return;
    }
    setUpdatingNotes(true);
    try {
      await updateDoc(doc(db, 'games', gameId), { notes });
      setGame({ ...game, notes });
      toast.success(t('notes_updated_success'), { position: 'top-right' });
    } catch (err) {
      toast.error(t('failed_to_update_notes'), { position: 'top-right' });
      console.error('Update notes error:', err);
    } finally {
      setUpdatingNotes(false);
    }
  };

  const handleEditGame = () => {
    // Placeholder for edit functionality (e.g., navigate to an edit form)
    toast.info(t('edit_game_placeholder'), { position: 'top-right' });
  };

  const handleDeleteGame = async () => {
    if (!user || game.creator !== user.email) {
      toast.error(t('only_creator_can_delete'), { position: 'top-right' });
      return;
    }
    if (window.confirm(t('confirm_delete_game'))) {
      try {
        await deleteDoc(doc(db, 'games', gameId));
        toast.success(t('game_deleted_success'), { position: 'top-right' });
        navigate('/');
      } catch (err) {
        toast.error(t('failed_to_delete_game'), { position: 'top-right' });
        console.error('Delete game error:', err);
      }
    }
  };

  const createCalendarLink = () => {
    if (!game || !game.date || !game.time || typeof game.date !== 'string' || typeof game.time !== 'string') return '#';
    try {
      const startDateTime = new Date(`${game.date}T${game.time}:00`);
      if (isNaN(startDateTime.getTime())) return '#';
      const startTime = startDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const endTime = new Date(startDateTime.getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
      return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(game.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent('Pickup Basketball Game')}&location=${encodeURIComponent('Miami Beach')}`;
    } catch (error) {
      console.error('Error creating calendar link:', error);
      return '#';
    }
  };

  const createICalLink = () => {
    if (
      !game ||
      !game.date ||
      !game.time ||
      typeof game.date !== 'string' ||
      typeof game.time !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(game.date) ||
      !/^\d{2}:\d{2}$/.test(game.time)
    ) {
      console.warn('Invalid game data for iCal link:', { game });
      return '#';
    }
    try {
      const startDateTime = new Date(`${game.date}T${game.time}:00`);
      if (isNaN(startDateTime.getTime())) {
        console.warn('Invalid date/time combination:', { date: game.date, time: game.time });
        return '#';
      }
      const start = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = new Date(startDateTime.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:${game.title || 'Untitled Game'}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        'DESCRIPTION:Pickup Basketball Game',
        'LOCATION:Miami Beach',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');
      return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    } catch (error) {
      console.error('Error creating iCal link:', error);
      return '#';
    }
  };

  const handleShareX = () => {
    const shareText = `Check out ${game.title} at ${game.time} (${game.skill}) on Miami Pickup Basketball!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  if (loading) return <div>{t('loading_games')}</div>;
  if (!game) return <div>{t('game_not_found')}</div>;

  return (
    <div className="game-details" data-theme={theme}>
      <h2>{t('game_details')}</h2>
      <p><strong>{t('date_label')}</strong> {game.date}</p>
      <p><strong>{t('time_label')}</strong> {game.time}</p>
      <p><strong>{t('skill_label')}</strong> {game.skill}</p>
      <p><strong>{t('creator_label')}</strong> {game.creator}</p>
      <p><strong>{t('players_label')}</strong> {game.players && game.players.length > 0 ? `${game.players.join(', ')} (${game.players.length}/${game.maxPlayers || 10})` : `0/${game.maxPlayers || 10}`}</p>
      <p><strong>{t('notes_label')}</strong> {game.notes || t('no_notes')}</p>
      {user && game.creator === user.email && (
        <>
          <form onSubmit={handleUpdateNotes} className="notes-form">
            <textarea
              placeholder={t('notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label={t('notes_label')}
            />
            <button
              type="submit"
              disabled={updatingNotes}
              aria-label={updatingNotes ? t('updating') : t('update_notes')}
            >
              {updatingNotes ? t('updating') : t('update_notes')}
            </button>
          </form>
          <div className="game-actions">
            <button
              onClick={handleEditGame}
              className="edit-button"
              aria-label={t('edit_game')}
            >
              {t('edit_game')}
            </button>
            <button
              onClick={handleDeleteGame}
              className="delete-button"
              aria-label={t('delete_game')}
            >
              {t('delete_game')}
            </button>
          </div>
        </>
      )}
      {user && (
        game.players && game.players.includes(user.uid) ? (
          <div className={`joined-info ${joinedGame ? 'fade-in' : ''}`}>
            <span className="joined-label" aria-label={t('joined_status')}>{t('joined')}</span>
            <span className="court-name" aria-label={t('player_name')}>{userPlayerName} {t('joined_game')}</span>
            <button
              onClick={handleLeave}
              className="leave-button"
              aria-label={t('leave_game')}
            >
              {t('leave_game')}
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            className="join-button"
            disabled={joining}
            aria-label={t('join_game')}
          >
            {joining ? <ClipLoader color="#fff" size={20} /> : t('join')}
          </button>
        )
      )}
      <a
        href={createCalendarLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="calendar-link"
        aria-label={t('add_to_calendar')}
      >
        {t('add_to_calendar')}
      </a>
      <a
        href={createICalLink()}
        download={`${game.title || 'Untitled Game'}.ics`}
        className="ical-link"
        aria-label={t('download_ical')}
      >
        {t('download_ical')}
      </a>
      <button
        onClick={handleShareX}
        className="share-button"
        aria-label={t('share_on_x')}
      >
        {t('X')}
      </button>
      <Link to="/" className="back-link" aria-label={t('back_to_games')}>{t('back_to_games')}</Link>
    </div>
  );
}

export default GameDetails;