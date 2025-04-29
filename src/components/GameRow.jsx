import React from 'react';
import { Link } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import { createCalendarLink, createICalLink, handleShareX, getGameStatus } from '../utils/gameUtils';
import { format } from 'date-fns';
import './GameRow.css';

const GameRow = ({ game, user, users, joiningGameId, joinedGameId, handleJoin, handleDelete, handleEdit, t }) => {
  const status = getGameStatus(game);
  const creator = users[game.creator]?.displayName || game.creator?.split('@')[0] || t('unknown_creator');
  const isCreator = user && game.creator === user.email;
  const isJoined = user && game.players && game.players.includes(user.uid);

  return (
    <li className={`game-row ${status}`}>
      <Link to={`/game/${game.id}`} className="game-link" aria-label={t('join_game', { title: game.title })}>
        {game.title}
      </Link>
      <span className="game-date">
        {t('date_label')} {game.date ? format(new Date(game.date), 'MMM dd, yyyy') : t('no_date')}
      </span>
      <span className="court-name">
        {t('at')} {game.time} ({game.skill}) - {t('created_by')} {creator}
      </span>
      <span className="players-list">
        {game.players && game.players.length > 0 ? game.players.join(', ') : t('no_players')}
      </span>
      {user && (
        isJoined ? (
          <div className={`joined-info ${joinedGameId === game.id ? 'fade-in' : ''}`}>
            <span className="joined-label" aria-label={t('joined_status')}>
              {t('joined')}
            </span>
          </div>
        ) : (
          <button
            onClick={() => handleJoin(game)}
            className="join-button"
            disabled={joiningGameId === game.id}
            aria-label={t('join_game', { title: game.title })}
          >
            {joiningGameId === game.id ? <ClipLoader color="#fff" size={20} /> : t('join')}
          </button>
        )
      )}
      <div className="share-buttons">
        <a
          href={createCalendarLink(game)}
          target="_blank"
          rel="noopener noreferrer"
          className="calendar-link"
          aria-label={t('add_to_calendar_for', { title: game.title })}
        >
          {t('add_to_calendar')}
        </a>
        <a
          href={createICalLink(game)}
          download={`${game.title || t('untitled_game')}.ics`}
          className="ical-link"
          aria-label={t('download_ical_for', { title: game.title })}
        >
          {t('download_ical')}
        </a>
        <button
          onClick={() => handleShareX(game)}
          className="share-button"
          aria-label={t('share_on_x_for', { title: game.title })}
        >
          {t('X')}
        </button>
      </div>
      {isCreator && (
        <>
          <button
            onClick={handleEdit}
            className="edit-button"
            aria-label={t('edit_game', { title: game.title })}
          >
            {t('edit_game')}
          </button>
          <button
            onClick={() => handleDelete(game)}
            className="delete-button"
            aria-label={t('delete_game', { title: game.title })}
          >
            {t('delete')}
          </button>
        </>
      )}
    </li>
  );
};

export default GameRow;