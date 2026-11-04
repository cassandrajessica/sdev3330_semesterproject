import { HeartIcon } from './Icons.jsx';
import { dateBadge, formatEventDate } from '../utils/dates.js';

// One event tile. Clicking the card opens the event; the heart saves it.
// `size` is "wide" for the Events In City grid and "tall" for carousels.
function EventCard({ event, saved, onToggleSave, onOpen, size = 'wide' }) {
  const badge = dateBadge(event.start_date);
  const place = [event.venue?.name, event.venue?.city].filter(Boolean).join(', ');

  return (
    <article className={`event-card event-card--${size}`}>
      <button type="button" className="event-card__open" onClick={() => onOpen(event)} aria-label={`Open ${event.name}`}>
        <div className="event-card__media">
          {event.image_url ? (
            <img src={event.image_url} alt="" loading="lazy" />
          ) : (
            <div className="event-card__placeholder" />
          )}
          {badge && (
            <span className="event-card__badge">
              <span>{badge.month}</span>
              <strong>{badge.day}</strong>
            </span>
          )}
        </div>

        <div className="event-card__body">
          {event.category && <span className="event-card__category">{event.genre && event.genre !== 'Undefined' ? event.genre : event.category}</span>}
          <h3 className="event-card__title">{event.name}</h3>
          <p className="event-card__meta">{formatEventDate(event.start_date, event.start_time)}</p>
          {place && <p className="event-card__meta">{place}</p>}
          {event.price_label && <p className="event-card__price">{event.price_label}</p>}
        </div>
      </button>

      <button
        type="button"
        className={`event-card__save ${saved ? 'is-saved' : ''}`}
        onClick={() => onToggleSave(event)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${event.name} from saved events` : `Save ${event.name}`}
      >
        <HeartIcon filled={saved} width={20} height={20} />
      </button>
    </article>
  );
}

export default EventCard;
