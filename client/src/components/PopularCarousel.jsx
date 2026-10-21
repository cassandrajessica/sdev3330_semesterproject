import { useEffect, useState } from 'react';
import Carousel from './Carousel.jsx';
import EventCard from './EventCard.jsx';
import { searchEvents } from '../utils/events.js';
import useEventPanel from '../hooks/useEventPanel.js';

// A carousel of the most relevant upcoming events for the given search params.
function PopularCarousel({ title, id, params, saved, onToggleSave }) {
  const openEvent = useEventPanel();
  const [state, setState] = useState({ events: [], loading: true, error: '' });
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: '' }));
    searchEvents({ ...JSON.parse(paramsKey), sort: 'relevance,desc', size: 12 })
      .then((data) => !cancelled && setState({ events: data.events, loading: false, error: '' }))
      .catch((err) => !cancelled && setState({ events: [], loading: false, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  let empty = null;
  if (!state.loading && state.error) empty = "Couldn't load events right now.";
  else if (!state.loading && state.events.length === 0) empty = 'Nothing coming up here yet.';

  return (
    <Carousel title={title} id={id} empty={empty}>
      {state.loading
        ? Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton skeleton--tall" />)
        : state.events.map((e) => (
            <EventCard key={e.ticketmaster_id} event={e} size="tall" saved={saved.isSaved(e.ticketmaster_id)} onToggleSave={onToggleSave} onOpen={openEvent} />
          ))}
    </Carousel>
  );
}

export default PopularCarousel;
