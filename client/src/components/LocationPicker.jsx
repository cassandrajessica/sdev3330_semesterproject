import { useEffect, useRef, useState } from 'react';
import { CrosshairIcon, PinIcon } from './Icons.jsx';
import { RADIUS_OPTIONS } from '../hooks/useUserLocation.js';

// The location pill next to "Events In ...". Opens a small panel where the
// person can turn on location or type a city.
function LocationPicker({ loc }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close when clicking outside the panel or pressing Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close the panel once location has been found.
  const wasLocating = useRef(false);
  useEffect(() => {
    if (wasLocating.current && loc.status === 'idle' && loc.isGeo) {
       
      setOpen(false);
    }
    wasLocating.current = loc.status === 'locating';
  }, [loc.status, loc.isGeo]);

  function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    loc.setManual(form.get('city'), form.get('stateCode'));
    setOpen(false);
  }

  return (
    <div className="loc-picker" ref={wrapRef}>
      <button type="button" className="loc-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        {loc.isGeo ? <CrosshairIcon width={16} height={16} /> : <PinIcon width={16} height={16} />}
        {loc.label}
      </button>

      {open && (
        <div className="loc-panel" role="dialog" aria-label="Choose a location">
          <button type="button" className="loc-geo-btn" onClick={loc.requestGeo} disabled={loc.status === 'locating'}>
            <CrosshairIcon width={18} height={18} />
            {loc.status === 'locating' ? 'Finding you...' : loc.isGeo ? 'Update my location' : 'Use my current location'}
          </button>

          {loc.isGeo && (
            <div className="loc-radius" role="group" aria-label="Search distance">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`chip ${(loc.location.radius || 25) === r ? 'is-active' : ''}`}
                  onClick={() => loc.setRadius(r)}
                  aria-pressed={(loc.location.radius || 25) === r}
                >
                  {r} mi
                </button>
              ))}
            </div>
          )}

          {loc.error && <p className="loc-error" role="alert">{loc.error}</p>}

          <div className="loc-divider"><span>or enter a city</span></div>

          <form className="loc-form" onSubmit={handleSubmit}>
            <input name="city" placeholder="City" defaultValue={loc.isGeo ? '' : loc.location.city} aria-label="City" required />
            <input name="stateCode" placeholder="TX" defaultValue={loc.isGeo ? '' : loc.location.stateCode} aria-label="State code" maxLength={2} className="loc-form__state" />
            <button type="submit" className="chip chip--dark">Go</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
