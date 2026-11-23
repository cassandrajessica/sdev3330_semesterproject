import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Carousel from './Carousel.jsx';
import EventCard from './EventCard.jsx';
import useEventPanel from '../hooks/useEventPanel.js';
import { CATEGORIES } from '../utils/categories.js';
import { mergeRecommendations, searchEvents } from '../utils/events.js';

// "Recommended For You": upcoming events in the user's favorite categories,
// within their travel radius of their home ZIP code. The server turned the ZIP
// into lat/lng when it was saved. Runs one search per favorite category and
// mixes the results together.
function RecommendedCarousel({ preferences, saved, onToggleSave }) {
  const openEvent = useEventPanel();
  const [state, setState] = useState({ events: [], loading: true, error: '' });
  const prefsKey = JSON.stringify(preferences);

  useEffect(() => {
    const { lat, lng, radius, categories } = JSON.parse(prefsKey);
    const picked = CATEGORIES.filter((c) => categories.includes(c.id));
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: '' }));

    Promise.all(
      picked.map((c) =>
        searchEvents({ ...c.params, lat, lng, radius, sort: 'date,asc', size: 8 })
          .then((data) => data.events)
          .catch(() => []) // one category failing shouldn't hide the others
      )
    )
      .then((lists) => !cancelled && setState({ events: mergeRecommendations(lists), loading: false, error: '' }))
      .catch((err) => !cancelled && setState({ events: [], loading: false, error: err.message }));

    return () => {
      cancelled = true;
    };
  }, [prefsKey]);

  let empty = null;
  if (!state.loading && state.error) empty = "Couldn't load your recommendations right now.";
  else if (!state.loading && state.events.length === 0) empty = 'Nothing matches your preferences yet. Try a bigger radius or more categories.';

  const subtitle = (
    <>
      Within {preferences.radius} mi of {preferences.place || preferences.zip} &middot; <Link to="/preferences">Edit preferences</Link>
    </>
  );

  return (
    <Carousel title="Recommended For You" id="recommended" empty={empty} subtitle={subtitle}>
      {state.loading
        ? Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton skeleton--tall" />)
        : state.events.map((e) => (
            <EventCard key={e.ticketmaster_id} event={e} size="tall" saved={saved.isSaved(e.ticketmaster_id)} onToggleSave={onToggleSave} onOpen={openEvent} />
          ))}
    </Carousel>
  );
}

export default RecommendedCarousel;
