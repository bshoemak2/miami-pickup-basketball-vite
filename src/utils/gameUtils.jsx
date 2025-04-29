import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const MAX_RETRIES = 3;

export const fetchGamesData = async (db, t, retries = 0) => {
  try {
    console.log('Fetching users...');
    const userSnapshot = await getDocs(collection(db, 'users'));
    console.log('Users fetched:', userSnapshot.docs.length, userSnapshot.docs.map(doc => ({ uid: doc.id, playerName: doc.data().playerName })));
    const usersData = userSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = {
        displayName: doc.data().displayName || doc.data().email?.split('@')[0] || 'Unknown User',
        playerName: doc.data().playerName || 'Not set',
      };
      return acc;
    }, {});
    console.log('Users data:', usersData);

    console.log('Fetching games...');
    const gameSnapshot = await getDocs(collection(db, 'games'));
    console.log('Raw games:', gameSnapshot.docs.map(doc => ({ id: doc.id, creator: doc.data().creator, players: doc.data().players })));
    const gameList = gameSnapshot.docs.map(doc => {
      const gameData = doc.data();
      const creator = gameData.creator;
      // Handle creator as user ID, name, or email
      let creatorName = 'Unknown Creator';
      if (creator && typeof creator === 'string') {
        if (usersData[creator]) {
          creatorName = usersData[creator].displayName; // Creator is a user ID
        } else if (creator.includes('@')) {
          creatorName = creator.split('@')[0]; // Creator is an email
        } else {
          creatorName = creator; // Creator is a name
        }
      }
      const players = gameData.players || [];
      console.log(`Mapping creator ${creator} to ${creatorName}`);
      return {
        id: doc.id,
        ...gameData,
        creatorName,
        players: players.map(player => {
          const playerName = usersData[player]?.playerName || 'Unknown Player';
          console.log(`Mapping player ${player} to ${playerName}`);
          return playerName;
        }),
      };
    });
    gameList.sort((a, b) => new Date(a.date || '1970-01-01') - new Date(b.date || '1970-01-01'));
    return { usersData, gameList };
  } catch (err) {
    console.error('Error in fetchGamesData:', err);
    if (retries < MAX_RETRIES) {
      console.log(`Retrying fetchGamesData (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return fetchGamesData(db, t, retries + 1);
    }
    throw new Error(t('fetch_games_error', { message: err.message }));
  }
};

export const handleJoinGame = async (game, user, users, db, t, setJoiningGameId, setJoinedGameId, setGames) => {
  if (!user) {
    toast.error(t('please_login_to_join'), { position: 'top-right' });
    return;
  }
  const maxPlayers = game.maxPlayers || 10;
  if ((game.players || []).length >= maxPlayers) {
    toast.error(t('game_full'), { position: 'top-right' });
    return;
  }
  setJoiningGameId(game.id);
  try {
    const userPlayerName = users[user.uid]?.playerName || 'Not set';
    const gameRef = doc(db, 'games', game.id);
    const updatedPlayers = [...(game.players || [])];
    if (!updatedPlayers.includes(user.uid)) {
      updatedPlayers.push(user.uid);
      await updateDoc(gameRef, { players: updatedPlayers });
      const { gameList } = await fetchGamesData(db, t);
      setGames(gameList);
      setJoinedGameId(game.id);
      toast.success(`${userPlayerName} ${t('joined_game')}`, { position: 'top-right' });
      console.log(`Joined ${game.title} as ${user.uid}`);
    }
  } catch (err) {
    console.error('Join game error:', err);
    toast.error(t('failed_to_join_game'), { position: 'top-right' });
    throw new Error(t('failed_to_join_game', { message: err.message }));
  } finally {
    setJoiningGameId(null);
  }
};

export const handleDeleteGame = async (game, user, users, db, t, setGames) => {
  if (!user || game.creator !== user.email) {
    toast.error(t('only_creator_can_delete'), { position: 'top-right' });
    return;
  }
  if (window.confirm(t('confirm_delete', { title: game.title }))) {
    try {
      await deleteDoc(doc(db, 'games', game.id));
      const { gameList } = await fetchGamesData(db, t);
      setGames(gameList);
      toast.success(t('game_deleted_success'), { position: 'top-right' });
      console.log(`Deleted ${game.title}`);
    } catch (err) {
      console.error('Delete game error:', err);
      toast.error(t('failed_to_delete_game'), { position: 'top-right' });
      throw new Error(t('failed_to_delete_game', { message: err.message }));
    }
  }
};

export const handleUpdateGame = async (updatedGame, users, db, t, setGames, setEditingGame) => {
  try {
    const gameRef = doc(db, 'games', updatedGame.id);
    await updateDoc(gameRef, {
      title: updatedGame.title,
      date: updatedGame.date,
      time: updatedGame.time,
      skill: updatedGame.skill,
      notes: updatedGame.notes,
    });
    const { gameList } = await fetchGamesData(db, t);
    setGames(gameList);
    setEditingGame(null);
    toast.success(t('game_updated'), { position: 'top-right' });
  } catch (err) {
    console.error('Update game error:', err);
    toast.error(t('failed_to_update_game'), { position: 'top-right' });
    throw new Error(t('failed_to_update_game', { message: err.message }));
  }
};

export const createCalendarLink = (game) => {
  if (!game || !game.date || !game.time || typeof game.date !== 'string' || typeof game.time !== 'string') {
    console.log('Invalid date or time in createCalendarLink:', game);
    return '#';
  }
  try {
    const startDateTime = new Date(`${game.date}T${game.time}:00`);
    if (isNaN(startDateTime.getTime())) {
      console.log('Invalid Date object in createCalendarLink:', startDateTime, 'Game:', game);
      return '#';
    }
    const startTime = startDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endTime = new Date(startDateTime.getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(game.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent('Pickup Basketball Game')}&location=${encodeURIComponent('Miami Beach')}`;
  } catch (error) {
    console.error('Error creating calendar link:', error);
    return '#';
  }
};

export const createICalLink = (game) => {
  if (!game || !game.date || !game.time || typeof game.date !== 'string' || typeof game.time !== 'string') {
    console.log('Invalid date or time in createICalLink:', game);
    return '#';
  }
  try {
    const startDateTime = new Date(`${game.date}T${game.time}:00`);
    if (isNaN(startDateTime.getTime())) {
      console.log('Invalid Date object in createICalLink:', startDateTime, 'Game:', game);
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
    const blob = new Blob([ics], { type: 'text/calendar' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating iCal link:', error);
    return '#';
  }
};

export const handleShareX = (game) => {
  const shareText = `Check out ${game.title} at ${game.time} (${game.skill}) on Miami Pickup Basketball!`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  window.open(xUrl, '_blank');
};

export const handleShareTikTok = (game, t) => {
  const shareText = `Check out ${game.title} at ${game.time} (${game.skill}) on Miami Pickup Basketball!`;
  navigator.clipboard.writeText(shareText);
  toast.success(t('text_copied_tiktok'), { position: 'top-right' });
  window.open('https://www.tiktok.com', '_blank');
};

export const handleShareInstagram = (game, t) => {
  const shareText = `Check out ${game.title} at ${game.time} (${game.skill}) on Miami Pickup Basketball!`;
  navigator.clipboard.writeText(shareText);
  toast.success(t('text_copied_instagram'), { position: 'top-right' });
  window.open('https://www.instagram.com', '_blank');
};

export const getGameStatus = (game) => {
  const now = new Date();
  const gameDateTime = new Date(`${game.date}T${game.time}:00`);
  if (gameDateTime < now) {
    return 'completed';
  } else if (gameDateTime > now && gameDateTime < new Date(now.getTime() + 2 * 60 * 60 * 1000)) {
    return 'in-progress';
  } else {
    return 'upcoming';
  }
};