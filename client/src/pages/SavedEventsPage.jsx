import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import EventCard from '../components/EventCard.jsx';
import { ArrowLeft, CloseIcon } from '../components/Icons.jsx';
import useEventPanel from '../hooks/useEventPanel.js';
import useSavedEvents, { useSaveHandler } from '../hooks/useSavedEvents.js';
import { savedRowToEvent } from '../utils/events.js';
import './SavedEventsPage.css';

// /saved: every saved event on one page, upcoming first and past events below.
function SavedEventsPage() {
  const navigate = useNavigate();
  const saved = useSavedEvents();
  const handleToggleSave = useSaveHandler(saved, navigate);
  const [keyword, setKeyword] = useState('');

  // Only signed-in users have saved events.
  if (!saved.user) return <Navigate to="/login" replace />;

  return (
    <Layout saved={saved} onSearch={setKeyword}>
      <section className="saved-hero">
        <Link to="/dashboard" className="saved-hero__back">
          <ArrowLeft width={18} height={18} /> Back to events
        </Link>
        <h1>Your Saved Events</h1>
        <p>Everything you&rsquo;ve saved in one place, with upcoming events first and past events below.</p>
      </section>

      {keyword && (
        <div className="chips chips--active saved-filter">
          <button type="button" className="chip chip--removable" onClick={() => setKeyword('')}>
            &ldquo;{keyword}&rdquo; <CloseIcon width={14} height={14} />
          </button>
        </div>
      )}

      <SavedSections saved={saved} keyword={keyword} onToggleSave={handleToggleSave} />
    </Layout>
  );
}

// Rendered inside Layout so the event cards can open the event details panel.
function SavedSections({ saved, keyword, onToggleSave }) {
  const openEvent = useEventPanel();
  const location = useLocation();

  const text = keyword.trim().toLowerCase();
  const matches = (row) =>
    !text ||
    [row.name, row.venue_name, row.venue_city, row.category, row.genre]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(text));

  const upcoming = saved.upcoming.filter(matches);
  const past = saved.past.filter(matches);

  // "See all events" on the Past list in the drawer links to /saved#past.
  useEffect(() => {
    if (!saved.loading && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
    }
  }, [saved.loading, location.hash]);

  return (
    <>
      <SavedSection
        id="upcoming"
        title="Upcoming"
        rows={upcoming}
        loading={saved.loading}
        emptyText={keyword ? 'No upcoming saved events match your search.' : 'Tap the heart on any event to save it for later.'}
        onOpen={openEvent}
        onToggleSave={onToggleSave}
        isSaved={saved.isSaved}
      />
      <SavedSection
        id="past"
        title="Past"
        rows={past}
        loading={saved.loading}
        emptyText={keyword ? 'No past saved events match your search.' : 'Saved events move here after their date passes.'}
        onOpen={openEvent}
        onToggleSave={onToggleSave}
        isSaved={saved.isSaved}
        muted
      />
    </>
  );
}

function SavedSection({ id, title, rows, loading, emptyText, onOpen, onToggleSave, isSaved, muted }) {
  return (
    <section className="dash-section" id={id}>
      <div className="dash-section__head">
        <h2 className="dash-heading">
          {title} <span className="saved-count">{rows.length}</span>
        </h2>
      </div>

      {loading && rows.length === 0 ? (
        <p className="dash-empty">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="dash-empty">{emptyText}</p>
      ) : (
        <div className={`event-grid ${muted ? 'is-past' : ''}`}>
          {rows.map((row) => {
            const event = savedRowToEvent(row);
            return (
              <EventCard key={row.id} event={event} saved={isSaved(event.ticketmaster_id)} onToggleSave={onToggleSave} onOpen={onOpen} />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SavedEventsPage;
