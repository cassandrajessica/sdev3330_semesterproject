import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from './Icons.jsx';

// A titled row that scrolls sideways, with the round arrow buttons from the mockup.
function Carousel({ title, id, children, empty }) {
  const trackRef = useRef(null);

  function scrollBy(direction) {
    const track = trackRef.current;
    if (!track) return;
    // Move by most of a screen width so the next set of cards slides in.
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  }

  return (
    <section className="dash-section" id={id} aria-label={title}>
      <div className="dash-section__head">
        <h2 className="dash-heading">{title}</h2>
        <div className="carousel-arrows">
          <button type="button" className="round-btn" onClick={() => scrollBy(-1)} aria-label={`Scroll ${title} left`}>
            <ArrowLeft />
          </button>
          <button type="button" className="round-btn" onClick={() => scrollBy(1)} aria-label={`Scroll ${title} right`}>
            <ArrowRight />
          </button>
        </div>
      </div>
      {empty ? <p className="dash-empty">{empty}</p> : <div className="carousel-track" ref={trackRef}>{children}</div>}
    </section>
  );
}

export default Carousel;
