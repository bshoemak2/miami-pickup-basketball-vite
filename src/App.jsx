import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth, db, onAuthStateChanged, signOut } from './firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import playersImage from './images/players_1.jpg';
import altMiamiImage from './images/alt_miami_image2.jpg';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Particles } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import AuthForm from './components/AuthForm.jsx';
import GameList from './components/GameList.jsx';
import Profile from './components/Profile.jsx';
import ContactUs from './components/ContactUs.jsx';
import ErrorBoundaryWithTranslation from './ErrorBoundary.jsx';
import GameDetails from './GameDetails.jsx';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(!localStorage.getItem('welcomeModalShown'));
  const [featuredGames, setFeaturedGames] = useState([]);

  const affiliateProducts = useMemo(() => [
    { name: 'Spalding Street Performance Outdoor Basketballs', link: 'https://amzn.to/3XGxAyO', image: 'https://m.media-amazon.com/images/I/7187crn3osS._AC_SX679_.jpg' },
    { name: 'Venoms Printings Glow in The Dark Basketball', link: 'https://amzn.to/4cd8de3', image: 'https://m.media-amazon.com/images/I/71fjmV-FKOL._AC_SX679_.jpg' },
    { name: 'WILSON FIBA 3X3', link: 'https://amzn.to/4hSXJBP', image: 'https://m.media-amazon.com/images/I/81ucIYgfXkL._AC_SX679_.jpg' },
    { name: 'Men\'s Basketball Shoes Shock-Absorbing', link: 'https://amzn.to/3Eaebzy', image: 'https://m.media-amazon.com/images/I/71EL4VnHG8L._AC_SY535_.jpg' },
    { name: 'Nike Ja 1 Men\'s Basketball Shoes', link: 'https://amzn.to/4jhPQqF', image: 'https://m.media-amazon.com/images/I/71Ebn15CsIL._AC_SX535_.jpg' },
    { name: 'Nike Sabrina 1 Unisex Basketball Shoe', link: 'https://amzn.to/3FNmXUK', image: 'https://m.media-amazon.com/images/I/61ZzaxKGxKL._AC_SX535_.jpg' },
    { name: 'Gatorade 32 Oz Squeeze Water Sports Bottle', link: 'https://amzn.to/3XGxTcW', image: 'https://m.media-amazon.com/images/I/61Oag2w5KjL._AC_SX425_.jpg' },
    { name: 'YETI Yonder Water Bottle', link: 'https://amzn.to/3FRNCzN', image: 'https://m.media-amazon.com/images/I/51-67XDmchL._AC_SX425_.jpg' },
    { name: 'YETI Rambler 26 oz Bottle', link: 'https://amzn.to/4cdoyiR', image: 'https://m.media-amazon.com/images/I/51hoerI1tlL._AC_SX679_.jpg' },
    { name: 'Star Wars Chewbacca Basketball T-Shirt', link: 'https://amzn.to/42d5aOe', image: 'https://m.media-amazon.com/images/I/A1dbsmzbGeL._CLa%7C2140%2C2000%7C81qLStXGPZL.png%7C0%2C0%2C2140%2C2000%2B0.0%2C0.0%2C2140.0%2C2000.0_AC_SX679_.png' },
    { name: 'YETI Camino 20 Carryall', link: 'https://amzn.to/4hW0nGP', image: 'https://m.media-amazon.com/images/I/61-f50QdV0L._AC_SX679_.jpg' },
    { name: 'Nike Lebron 19 Low Basketball Shoes', link: 'https://amzn.to/41RDgIL', image: 'https://m.media-amazon.com/images/I/51BTHvABRiL._AC_SY535_.jpg' },
    { name: 'Spalding TF DNA Smart Basketball + 1 Yr App Subscription', link: 'https://amzn.to/4hTs8jr', image: 'https://m.media-amazon.com/images/I/71hcrRFqW3L._AC_SX679_.jpg' },
    { name: 'Point 3 Road Trip 2.0 Backpack Basketball Backpack with Drawstrong Closure', link: 'https://amzn.to/4j8cpxH', image: 'https://m.media-amazon.com/images/I/71R27vLUTNL._AC_SX679_.jpg' },
    { name: 'ChalkTalkSPORTS Basketball Performance Shorts - Graffiti - Youth & Adult', link: 'https://amzn.to/3E4iBbk', image: 'https://m.media-amazon.com/images/I/71bgerfUFWL._AC_SX679_.jpg' },
    { name: 'ChalkTalkSPORTS Basketball Performance Crew Socks - Multiple Colors - Youth & Adult', link: 'https://amzn.to/4hZQpEm', image: 'https://m.media-amazon.com/images/I/71hUxesJy0L._AC_SX679_.jpg' },
  ], []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed. Current user:', currentUser);
      setUser(currentUser);
      setIsLoadingUser(true);
      if (currentUser && mounted) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            const fetchedPlayerName = data.playerName || currentUser.email.split('@')[0];
            setPlayerName(fetchedPlayerName);
            console.log('Player name set to:', fetchedPlayerName);
          } else {
            const fallbackName = currentUser.email.split('@')[0];
            setPlayerName(fallbackName);
            console.log('No profile doc found, using fallback player name:', fallbackName);
          }
        } catch (err) {
          console.error('Error fetching playerName:', err);
          const fallbackName = currentUser.email.split('@')[0];
          setPlayerName(fallbackName);
          console.log('Error occurred, using fallback player name:', fallbackName);
        }
      } else if (mounted) {
        setPlayerName('');
      }
      setIsLoadingUser(false);
    });

    const fetchFeaturedGames = async () => {
      try {
        const gamesSnapshot = await getDocs(collection(db, 'games'));
        const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const upcoming = games
          .filter(game => new Date(`${game.date}T${game.time}:00`) > new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
        setFeaturedGames(upcoming);
      } catch (err) {
        console.error('Error fetching featured games:', err);
      }
    };
    fetchFeaturedGames();

    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowBackToTop(window.scrollY > 300);
      }, 100);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [db]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  }, [i18n]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme]);

  const closeWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
    localStorage.setItem('welcomeModalShown', 'true');
  }, []);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const particlesOptions = useMemo(() => ({
    particles: {
      number: { value: 50, density: { enable: true, value_area: 800 } },
      color: { value: theme === 'dark' ? '#ff69b4' : '#ff0066' },
      shape: { type: 'circle' },
      opacity: { value: 0.5, random: true },
      size: { value: 3, random: true },
      move: { enable: true, speed: 2, direction: 'none', random: true },
    },
    interactivity: {
      events: { onHover: { enable: true, mode: 'repulse' }, onClick: { enable: true, mode: 'push' } },
      modes: { repulse: { distance: 100 }, push: { quantity: 4 } },
    },
  }), [theme]);

  const carouselSettings = useMemo(() => ({
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  }), []);

  console.log('Rendering App with playerName:', playerName);

  return (
    <Router>
      <ErrorBoundaryWithTranslation>
        <nav className="app-nav">
          <Link to="/" className="nav-link" aria-label={t('home')}>{t('home')}</Link>
          {user && <Link to="/profile" className="nav-link" aria-label={t('profile')}>{t('profile')}</Link>}
          <Link to="/contact" className="nav-link" aria-label={t('contact_us')}>{t('contact_us')}</Link>
          {user && (
            <button
              onClick={handleLogout}
              className="nav-button"
              aria-label={t('logout')}
            >
              {t('logout')}
            </button>
          )}
        </nav>
        <Routes>
          <Route
            path="/"
            element={
              <div className="App" data-theme={theme}>
                {showWelcomeModal && (
                  <div className="welcome-modal">
                    <div className="modal-content">
                      <h2>{t('welcome_to_app')}</h2>
                      <p>{t('welcome_message_1')}</p>
                      <p>{t('welcome_message_2')}</p>
                      <p>{t('welcome_message_3')}</p>
                      <button onClick={closeWelcomeModal} aria-label={t('close_welcome_modal')}>
                        {t('get_started')}
                      </button>
                    </div>
                  </div>
                )}
                <div className="hero-section">
                  <Particles id="tsparticles" init={particlesInit} options={particlesOptions} className="particles" />
                  <h1>{t('welcome_to_app')}</h1>
                  <p>{t('welcome_message_1')}</p>
                  {user ? (
                    <Link to="/profile" className="hero-cta">{t('setup_profile')}</Link>
                  ) : (
                    <button
                      onClick={() => document.querySelector('.auth-form')?.scrollIntoView({ behavior: 'smooth' })}
                      className="hero-cta"
                    >
                      {t('get_started')}
                    </button>
                  )}
                </div>
                <div className="title-wrapper">
                  <h1>{t('app_title')}</h1>
                  <span className="flamingo">🦩</span>
                  <span className="beta">Beta</span>
                </div>
                <div className="header-controls">
                  <button
                    onClick={toggleLanguage}
                    className="language-toggle"
                    aria-label={i18n.language === 'en' ? t('switch_to_spanish') : t('switch_to_english')}
                  >
                    {t('switch_to')} {i18n.language === 'en' ? 'Spanish' : 'English'}
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="theme-toggle"
                    aria-label={theme === 'light' ? t('switch_to_dark_mode') : t('switch_to_light_mode')}
                  >
                    {theme === 'light' ? t('dark_mode') : t('light_mode')}
                  </button>
                </div>
                {!user ? (
                  <AuthForm
                    auth={auth}
                    onLoginSuccess={() => console.log('Login successful')}
                    onSignupSuccess={() => console.log('Signup successful')}
                  />
                ) : (
                  <div className="header-buttons">
                    <p>
                      {isLoadingUser
                        ? t('loading_welcome')
                        : playerName
                        ? t('welcome', { playerName })
                        : t('loading_welcome')}
                    </p>
                  </div>
                )}
                <div className="featured-games">
                  <h2>{t('featured_games')}</h2>
                  {featuredGames.length > 0 ? (
                    <Slider {...carouselSettings} className="carousel-container">
                      {featuredGames.map(game => (
                        <div key={game.id} className="carousel-item">
                          <h3>{game.title}</h3>
                          <p>{t('at')} {game.time} ({game.skill})</p>
                          <p>{t('created_by')} {game.creator?.split('@')[0] || 'Unknown'}</p>
                        </div>
                      ))}
                    </Slider>
                  ) : (
                    <p>{t('no_games', { message: t('check_later') })}</p>
                  )}
                </div>
                <GameList user={user} db={db} />
                <div className="affiliate-links">
                  <h2 className="large-heading">{t('basketball_gear')}</h2>
                  <button
                    className="shop-now-cta"
                    onClick={() => window.scrollTo({ top: document.querySelector('.product-grid').offsetTop, behavior: 'smooth' })}
                  >
                    {t('shop_now')}
                  </button>
                  <div className="product-grid">
                    {affiliateProducts.map((product, index) => (
                      <a
                        key={index}
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-item"
                      >
                        <img src={product.image} alt={product.name} loading="lazy" />
                        <p>{product.name}</p>
                      </a>
                    ))}
                  </div>
                  <p className="affiliate-disclosure">{t('affiliate_disclosure')}</p>
                </div>
                <div className="social-media">
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={t('follow_on_x')}>
                    𝕏
                  </a>
                  <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={t('follow_on_tiktok')}>
                    🎵
                  </a>
                  <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={t('follow_on_instagram')}>
                    📸
                  </a>
                </div>
                <img src={playersImage} alt={t('flamingo_basketball_alt')} className="footer-image" loading="lazy" />
                <img src={altMiamiImage} alt={t('miami_basketball_alt')} className="alt-miami-image" loading="lazy" />
                <p className="sponsored-by-large">
                  {t('sponsor_text')}{' '}
                  <a href="https://shopping-assistant-5m0q.onrender.com/" target="_blank" rel="noopener noreferrer">
                    {t('sponsor_link')}
                  </a>
                </p>
                <footer className="app-footer">
                  <p>{t('footer_copyright')}</p>
                  <p>{t('footer_contact')} <a href="mailto:bshoemak@mac.com">bshoemak@mac.com</a></p>
                </footer>
                {showBackToTop && (
                  <button className="back-to-top" onClick={scrollToTop} aria-label={t('back_to_top')}>
                    {t('back_to_top')}
                  </button>
                )}
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
              </div>
            }
          />
          <Route path="/game/:gameId" element={<GameDetails theme={theme} />} />
          <Route path="/profile" element={<Profile user={user} theme={theme} db={db} />} />
          <Route path="/contact" element={<ContactUs theme={theme} />} />
        </Routes>
      </ErrorBoundaryWithTranslation>
    </Router>
  );
}

export default App;