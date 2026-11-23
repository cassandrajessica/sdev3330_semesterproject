import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Carousel from '../components/Carousel.jsx';
import EventGrid from '../components/EventGrid.jsx';
import PopularCarousel from '../components/PopularCarousel.jsx';
import RecommendedCarousel from '../components/RecommendedCarousel.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { ArrowRight, CloseIcon, CrosshairIcon } from '../components/Icons.jsx';
import useFlags from '../hooks/useFlags.js';
import usePreferences from '../hooks/usePreferences.js';
import useSavedEvents, { useSaveHandler } from '../hooks/useSavedEvents.js';
import useUserLocation from '../hooks/useUserLocation.js';
import { CATEGORIES } from '../utils/categories.js';
import { searchEvents, topVenues } from '../utils/events.js';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const saved = useSavedEvents();
  const handleToggleSave = useSaveHandler(saved, navigate);
  const loc = useUserLocation();

  // Onboarding feature flag: preferences banner and "Recommended For You"
  const { flags } = useFlags();
  const onboardingOn = !!flags.onboarding && !!saved.user;
  const prefs = usePreferences(onboardingOn);
  const [hidePrefsPrompt, setHidePrefsPrompt] = useState(false);

  // Filters for the Events grid (categories live on their own pages now)
  const [keyword, setKeyword] = useState('');
  const [venue, setVenue] = useState(null);
  const [hidePrompt, setHidePrompt] = useState(false);

  const [venues, setVenues] = useState({ list: [], loading: true });
  const eventsRef = useRef(null);

  const scrollToEvents = () => eventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Header links like /dashboard#categories scroll to that section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  // Top destinations reload when the location changes.
  const locKey = JSON.stringify(loc.params);
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVenues((v) => ({ ...v, loading: true }));
    setVenue(null);
    searchEvents({ ...JSON.parse(locKey), sort: 'date,asc', size: 60 })
      .then((data) => !cancelled && setVenues({ list: topVenues(data.events), loading: false }))
      .catch(() => !cancelled && setVenues({ list: [], loading: false }));
    return () => {
      cancelled = true;
    };
  }, [locKey]);

  function handleSearch(text) {
    setKeyword(text);
    scrollToEvents();
  }

  function pickVenue(v) {
    setVenue({ id: v.ticketmaster_venue_id, name: v.name });
    scrollToEvents();
  }

  const gridParams = { ...loc.params, venueId: venue?.id, keyword };
  const showPrompt = !loc.location.chosen && !hidePrompt;
  const showPrefsPrompt = onboardingOn && !prefs.loading && !prefs.preferences && !hidePrefsPrompt;

  return (
    <Layout saved={saved} onSearch={handleSearch}>
      {/* Hero */}
      <section className="dash-hero">
        <h1>Discover What&rsquo;s Happening In Your City</h1>
        <button type="button" className="explore-btn" onClick={scrollToEvents}>
          Explore
          <span className="explore-btn__arrow"><ArrowRight /></span>
        </button>
      </section>

      {/* Offer location until the person has picked one */}
      {showPrompt && (
        <div className="loc-prompt" role="region" aria-label="Location">
          <CrosshairIcon />
          <p>
            <strong>See what&rsquo;s happening near you.</strong> Turn on location, or keep browsing {loc.location.city}.
          </p>
          <button type="button" className="pill-btn pill-btn--dark" onClick={loc.requestGeo} disabled={loc.status === 'locating'}>
            {loc.status === 'locating' ? 'Finding you...' : 'Turn on location'}
          </button>
          <button type="button" className="loc-prompt__close" onClick={() => setHidePrompt(true)} aria-label="Not now">
            <CloseIcon width={18} height={18} />
          </button>
          {loc.error && <p className="loc-error loc-prompt__error" role="alert">{loc.error}</p>}
        </div>
      )}

      {/* Onboarding flag on, but no preferences saved yet */}
      {showPrefsPrompt && (
        <div className="loc-prompt" role="region" aria-label="Preferences">
          <p>
            <strong>Get events picked for you.</strong> Tell us your ZIP code, how far you&rsquo;ll travel and what you like.
          </p>
          <Link to="/preferences" className="pill-btn pill-btn--dark">
            Set preferences
          </Link>
          <button type="button" className="loc-prompt__close" onClick={() => setHidePrefsPrompt(true)} aria-label="Not now">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      )}

      {/* Explore By Category: each tile opens that category's page */}
      <section className="dash-section" id="categories">
        <h2 className="dash-heading dash-heading--center">Explore By Category</h2>
        <div className="cat-row">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/category/${c.id}`} className="cat-tile">
              <span className="cat-tile__box" style={{ background: c.color }} />
              <span className="cat-tile__label">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {onboardingOn && prefs.preferences && (
        <RecommendedCarousel preferences={prefs.preferences} saved={saved} onToggleSave={handleToggleSave} />
      )}

      <PopularCarousel title="Popular Events" id="popular" params={loc.params} saved={saved} onToggleSave={handleToggleSave} />

      <EventGrid
        id="events"
        sectionRef={eventsRef}
        params={gridParams}
        saved={saved}
        onToggleSave={handleToggleSave}
        heading={
          <div className="grid-heading">
            <h2 className="dash-heading">Events {loc.headingPlace}</h2>
            <LocationPicker loc={loc} />
          </div>
        }
        activeChips={
          (venue || keyword) && (
            <>
              {venue && (
                <button type="button" className="chip chip--removable" onClick={() => setVenue(null)}>
                  {venue.name} <CloseIcon width={14} height={14} />
                </button>
              )}
              {keyword && (
                <button type="button" className="chip chip--removable" onClick={() => setKeyword('')}>
                  &ldquo;{keyword}&rdquo; <CloseIcon width={14} height={14} />
                </button>
              )}
            </>
          )
        }
      />

      {/* Top Destinations */}
      <Carousel title="Top Destinations" id="destinations" empty={!venues.loading && venues.list.length === 0 && 'No venues found here yet.'}>
        {venues.loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton skeleton--tall" />)
          : venues.list.map((v) => (
              <button key={v.ticketmaster_venue_id} type="button" className="venue-card" onClick={() => pickVenue(v)}>
                {v.image_url ? <img src={v.image_url} alt="" loading="lazy" /> : <span className="event-card__placeholder" />}
                <span className="venue-card__text">
                  <strong>{v.name}</strong>
                  <span>
                    {v.count} upcoming {v.count === 1 ? 'event' : 'events'}
                  </span>
                </span>
              </button>
            ))}
      </Carousel>
    </Layout>
  );
}

export default Dashboard;
