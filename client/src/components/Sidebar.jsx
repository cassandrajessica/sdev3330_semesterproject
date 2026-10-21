import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkIcon, ClockIcon, CloseIcon, GridIcon, PanelIcon } from './Icons.jsx';
import { formatEventDate } from '../utils/dates.js';
import { CATEGORIES } from '../utils/categories.js';
import { savedRowToEvent } from '../utils/events.js';
import './Sidebar.css';

const PREVIEW_COUNT = 4;

// The slim rail on the left edge of the page. Clicking the panel icon (or any
// rail icon) slides open the drawer with saved events, past events and categories.
function Sidebar({ open, section, onOpen, onClose, user, upcoming, past, loading, onRemove, onPickCategory, onSignOut, onOpenEvent }) {
  const drawerRef = useRef(null);

  // Close with the Escape key and move focus into the drawer when it opens.
  useEffect(() => {
    if (!open) return;
    drawerRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Scroll the drawer to the section whose rail icon was clicked.
  useEffect(() => {
    if (open && section) {
      document.getElementById(`drawer-${section}`)?.scrollIntoView({ block: 'start' });
    }
  }, [open, section]);

  const railButtons = [
    { id: 'saved', label: 'Saved events', Icon: BookmarkIcon, count: upcoming.length },
    { id: 'past', label: 'Past events', Icon: ClockIcon },
    { id: 'browse', label: 'Browse categories', Icon: GridIcon },
  ];

  return (
    <>
      <nav className="side-rail" aria-label="Quick menu">
        <button
          type="button"
          className="side-rail__btn side-rail__btn--main"
          onClick={() => (open ? onClose() : onOpen(null))}
          aria-expanded={open}
          aria-controls="side-drawer"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <PanelIcon />
        </button>
        {railButtons.map(({ id, label, Icon, count }) => (
          <button key={id} type="button" className="side-rail__btn" onClick={() => onOpen(id)} aria-label={label} title={label}>
            <Icon />
            {count > 0 && <span className="side-rail__count">{count}</span>}
          </button>
        ))}
      </nav>

      <div className={`side-overlay ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside
        id="side-drawer"
        ref={drawerRef}
        className={`side-drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your HeyCiti menu"
        aria-hidden={!open}
        tabIndex={-1}
        inert={!open}
      >
        <div className="side-drawer__top">
          <span className="side-drawer__logo">HeyCiti</span>
          <button type="button" className="side-rail__btn" onClick={onClose} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        {user ? (
          <p className="side-drawer__hello">Signed in as <strong>{user.email}</strong></p>
        ) : (
          <div className="side-drawer__signin">
            <p>Sign in to save events and see them here.</p>
            <Link to="/login" className="pill-btn pill-btn--dark">Sign In</Link>
          </div>
        )}

        {user && (
          <>
            <DrawerList
              id="saved"
              title="Saved Events"
              items={upcoming}
              loading={loading}
              emptyText="Tap the heart on any event to save it for later."
              onRemove={onRemove}
              onOpenEvent={onOpenEvent}
            />
            <DrawerList
              id="past"
              title="Past Events"
              items={past}
              loading={loading}
              emptyText="Saved events move here after their date passes."
              onRemove={onRemove}
              onOpenEvent={onOpenEvent}
              muted
            />
          </>
        )}

        <section className="drawer-section" id="drawer-browse">
          <h3 className="drawer-section__title">Browse</h3>
          <ul className="drawer-cats">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onPickCategory(c.id)}>
                  <span className="drawer-cats__dot" style={{ background: c.color }} />
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {user && (
          <button type="button" className="side-drawer__signout" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </aside>
    </>
  );
}

// A short preview list of saved events, with a count of how many more there are.
function DrawerList({ id, title, items, loading, emptyText, onRemove, onOpenEvent, muted }) {
  const preview = items.slice(0, PREVIEW_COUNT);
  const extra = items.length - preview.length;

  return (
    <section className="drawer-section" id={`drawer-${id}`}>
      <h3 className="drawer-section__title">
        {title} <span className="drawer-section__count">{items.length}</span>
      </h3>

      {loading && items.length === 0 ? (
        <p className="drawer-empty">Loading...</p>
      ) : items.length === 0 ? (
        <p className="drawer-empty">{emptyText}</p>
      ) : (
        <ul className={`drawer-list ${muted ? 'is-muted' : ''}`}>
          {preview.map((e) => (
            <li key={e.id} className="drawer-item">
              <button type="button" className="drawer-item__link" onClick={() => onOpenEvent(savedRowToEvent(e))}>
                {e.image_url ? <img src={e.image_url} alt="" /> : <span className="drawer-item__thumb" />}
                <span className="drawer-item__text">
                  <strong>{e.name}</strong>
                  <span>{formatEventDate(e.start_date, e.start_time)}</span>
                  {e.venue_name && <span>{e.venue_name}</span>}
                </span>
              </button>
              <button type="button" className="drawer-item__remove" onClick={() => onRemove(e.id)} aria-label={`Remove ${e.name}`}>
                <CloseIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {extra > 0 && <p className="drawer-more">+ {extra} more</p>}
    </section>
  );
}

export default Sidebar;
