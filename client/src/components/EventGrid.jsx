import { useEffect, useRef, useState } from 'react';
import EventCard from './EventCard.jsx';
import { searchEvents } from '../utils/events.js';
import useEventPanel from '../hooks/useEventPanel.js';
import { dateRangeFor } from '../utils/dates.js';

const PAGE_SIZE = 9; // three rows of three, like the mockup

const DATE_FILTERS = [
  { id: 'any', label: 'Any date' },
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'month', label: 'Next 30 days' },
];

// The "Events In City" grid: date filter chips, the event cards and Load More.
// `params` holds the location plus any category, venue or keyword filters.
function EventGrid({ id, sectionRef, heading, params, activeChips, saved, onToggleSave, emptyText }) {
  const openEvent = useEventPanel();
  const [dateFilter, setDateFilter] = useState('any');
  const [grid, setGrid] = useState({ events: [], page: 0, totalPages: 0, loading: true, loadingMore: false, error: '' });
  const requestRef = useRef(0); // ignores responses from older searches

  // Compare params by value so a new object with the same contents
  // does not trigger another request.
  const paramsKey = JSON.stringify(params);

  function buildParams(page) {
    return { ...JSON.parse(paramsKey), ...dateRangeFor(dateFilter), sort: 'date,asc', size: PAGE_SIZE, page };
  }

  // Fresh search whenever the filters change.
  useEffect(() => {
    const requestId = ++requestRef.current;
     
    setGrid((g) => ({ ...g, loading: true, error: '' }));

    searchEvents(buildParams(0))
      .then((data) => {
        if (requestId !== requestRef.current) return;
        setGrid({ events: data.events, page: 0, totalPages: data.totalPages, loading: false, loadingMore: false, error: '' });
      })
      .catch((err) => {
        if (requestId !== requestRef.current) return;
        setGrid({ events: [], page: 0, totalPages: 0, loading: false, loadingMore: false, error: err.message });
      });
    // buildParams only reads paramsKey and dateFilter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, dateFilter]);

  async function loadMore() {
    const requestId = requestRef.current;
    const nextPage = grid.page + 1;
    setGrid((g) => ({ ...g, loadingMore: true }));
    try {
      const data = await searchEvents(buildParams(nextPage));
      if (requestId !== requestRef.current) return;
      setGrid((g) => {
        // Skip any event that is already showing.
        const seen = new Set(g.events.map((e) => e.ticketmaster_id));
        const fresh = data.events.filter((e) => !seen.has(e.ticketmaster_id));
        return { ...g, events: [...g.events, ...fresh], page: nextPage, totalPages: data.totalPages, loadingMore: false };
      });
    } catch (err) {
      setGrid((g) => ({ ...g, loadingMore: false, error: err.message }));
    }
  }

  const hasMore = grid.page + 1 < grid.totalPages;

  return (
    <section className="dash-section" id={id} ref={sectionRef}>
      <div className="dash-section__head dash-section__head--wrap">
        {heading}
        <div className="chips" role="group" aria-label="Date filter">
          {DATE_FILTERS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`chip ${dateFilter === d.id ? 'is-active' : ''}`}
              onClick={() => setDateFilter(d.id)}
              aria-pressed={dateFilter === d.id}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {activeChips && <div className="chips chips--active">{activeChips}</div>}

      {grid.error && !grid.loading && <p className="dash-empty">Couldn&rsquo;t load events right now. {grid.error}</p>}
      {!grid.error && !grid.loading && grid.events.length === 0 && (
        <p className="dash-empty">{emptyText || 'No events match these filters. Try another date or location.'}</p>
      )}

      <div className="event-grid">
        {grid.loading
          ? Array.from({ length: PAGE_SIZE }, (_, i) => <div key={i} className="skeleton skeleton--wide" />)
          : grid.events.map((e) => (
              <EventCard key={e.ticketmaster_id} event={e} saved={saved.isSaved(e.ticketmaster_id)} onToggleSave={onToggleSave} onOpen={openEvent} />
            ))}
      </div>

      {!grid.loading && hasMore && (
        <div className="load-more">
          <button type="button" className="pill-btn" onClick={loadMore} disabled={grid.loadingMore}>
            {grid.loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </section>
  );
}

export default EventGrid;
