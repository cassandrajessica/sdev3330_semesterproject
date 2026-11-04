import { useEffect, useRef, useState } from 'react';
import { CalendarIcon, CloseIcon, ExternalIcon, HeartIcon, PinIcon, TicketIcon } from './Icons.jsx';
import { apiFetch } from '../api.js';
import { formatEventDate } from '../utils/dates.js';
import { directionsUrl } from '../utils/events.js';
import './EventPanel.css';

// Ticketmaster status codes that need a warning instead of a normal ticket button
const STATUS_NOTES = {
  cancelled: 'This event has been cancelled.',
  postponed: 'This event has been postponed. Check back for a new date.',
  rescheduled: 'This event has been rescheduled. Confirm the new date before buying.',
  offsale: 'Tickets are not on sale right now.',
};

function formatSaleDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Side panel that slides in from the right with the event's details.
// Only the "Get Tickets" button leaves the site.
function EventPanel({ event, onClose, isSaved, onToggleSave }) {
  const [details, setDetails] = useState(null); // fuller copy from GET /api/events/:id
  const [detailsError, setDetailsError] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeBtnRef = useRef(null);
  const returnFocusRef = useRef(null);

  // Show what the card already had right away, then fill in the rest.
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/events/${event.ticketmaster_id}`)
      .then((data) => !cancelled && setDetails(data))
      .catch(() => !cancelled && setDetailsError(true));
    return () => {
      cancelled = true;
    };
  }, [event.ticketmaster_id]);

  // Focus the close button, stop the page behind from scrolling, and give
  // focus back to whatever opened the panel once it closes.
  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    closeBtnRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Play the slide-out animation before removing the panel.
  function close() {
    setClosing(true);
    setTimeout(onClose, 220);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Details from the API win, but keep anything the card had that the API left out.
  const e = details ? { ...event, ...details, venue: details.venue || event.venue } : event;
  const v = e.venue;
  const statusNote = STATUS_NOTES[e.status];
  const saved = isSaved(e.ticketmaster_id);
  const label = e.genre && e.genre !== 'Undefined' ? `${e.category} · ${e.genre}` : e.category;
  const mapsUrl = directionsUrl(v);
  const saleStart = formatSaleDate(e.sales_start);
  const saleEnd = formatSaleDate(e.sales_end);
  const salesUpcoming = e.sales_start && new Date(e.sales_start) > new Date();

  return (
    <div className={`ev-panel-root ${closing ? 'is-closing' : ''}`}>
      <div className="ev-overlay" onClick={close} aria-hidden="true" />

      <aside className="ev-panel" role="dialog" aria-modal="true" aria-labelledby="ev-title">
        <button type="button" ref={closeBtnRef} className="ev-close" onClick={close} aria-label="Close event details">
          <CloseIcon />
        </button>

        <div className="ev-media">
          {e.image_url ? <img src={e.image_url} alt="" /> : <div className="event-card__placeholder" />}
        </div>

        <div className="ev-body">
          {/* Main details */}
          <div className="ev-main">
            {label && <span className="ev-label">{label}</span>}
            <h2 id="ev-title" className="ev-title">{e.name}</h2>

            <p className="ev-when">
              <CalendarIcon width={18} height={18} />
              {formatEventDate(e.start_date, e.start_time)}
            </p>
            {v && (
              <p className="ev-when">
                <PinIcon width={18} height={18} />
                {[v.name, v.city && v.state ? `${v.city}, ${v.state}` : v.city].filter(Boolean).join(' · ')}
              </p>
            )}

            {statusNote && <p className="ev-alert" role="status">{statusNote}</p>}

            <h3 className="ev-subhead">About this event</h3>
            {e.description ? (
              <p className="ev-text">{e.description}</p>
            ) : (
              <p className="ev-text ev-muted">
                {details || detailsError ? 'The organizer hasn’t shared a description. Check the ticket page for full details.' : 'Loading details...'}
              </p>
            )}

            {e.please_note && (
              <>
                <h3 className="ev-subhead">Good to know</h3>
                <p className="ev-text">{e.please_note}</p>
              </>
            )}

            {(e.age_restricted || e.ticket_limit || e.promoter) && (
              <ul className="ev-facts">
                {e.age_restricted && <li>Age restrictions apply</li>}
                {e.ticket_limit && <li>{e.ticket_limit}</li>}
                {e.promoter && <li>Presented by {e.promoter}</li>}
              </ul>
            )}

            {e.seatmap_url && (
              <>
                <h3 className="ev-subhead">Seat map</h3>
                <img className="ev-seatmap" src={e.seatmap_url} alt={`Seat map for ${v?.name || 'the venue'}`} loading="lazy" />
              </>
            )}
          </div>

          {/* Ticket card */}
          <div className="ev-side">
            <div className="ev-card">
              <span className="ev-card__label">Tickets</span>
              <strong className="ev-price">{e.price_label || (details ? 'See Price on Official Seller' : ' ')}</strong>
              {salesUpcoming && saleStart && <p className="ev-small">On sale {saleStart}</p>}
              {!salesUpcoming && saleEnd && <p className="ev-small">Sales end {saleEnd}</p>}

              {e.url && (
                <a href={e.url} target="_blank" rel="noreferrer" className="pill-btn ev-tickets">
                  <TicketIcon width={20} height={20} />
                  {e.status === 'cancelled' ? 'View on Ticketmaster' : 'Get Tickets'}
                  <ExternalIcon width={16} height={16} />
                </a>
              )}
              <p className="ev-small ev-muted">Tickets are sold on Ticketmaster.</p>

              <button type="button" className={`ev-save ${saved ? 'is-saved' : ''}`} onClick={() => onToggleSave(e)} aria-pressed={saved}>
                <HeartIcon filled={saved} width={18} height={18} />
                {saved ? 'Saved' : 'Save event'}
              </button>
            </div>

            {v && (
              <div className="ev-card">
                <span className="ev-card__label">Venue</span>
                <strong className="ev-venue">{v.name}</strong>
                {(v.address || v.city) && (
                  <p className="ev-small">
                    {v.address && <>{v.address}<br /></>}
                    {[v.city, [v.state, v.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                  </p>
                )}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="ev-link">
                    Get directions <ExternalIcon width={14} height={14} />
                  </a>
                )}
              </div>
            )}

            {detailsError && <p className="ev-small ev-muted">Some details couldn&rsquo;t be loaded. The event may no longer be listed.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default EventPanel;
