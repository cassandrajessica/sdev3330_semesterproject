import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import SiteHeader from './SiteHeader.jsx';
import EventPanel from './EventPanel.jsx';
import { EventPanelContext } from '../hooks/useEventPanel.js';
import { useSaveHandler } from '../hooks/useSavedEvents.js';
import { CATEGORIES } from '../utils/categories.js';
import '../styles/site.css';

// Page frame shared by the dashboard and category pages: sidebar, header,
// footer and the event details panel.
function Layout({ saved, onSearch, children }) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState(null);
  const [panelEvent, setPanelEvent] = useState(null); // event shown in the side panel
  const handleToggleSave = useSaveHandler(saved, navigate);

  const openEvent = useCallback((event) => {
    setDrawerOpen(false);
    setPanelEvent(event);
  }, []);

  const openDrawer = useCallback((section) => {
    setDrawerSection(section);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  function goToCategory(id) {
    setDrawerOpen(false);
    navigate(`/category/${id}`);
  }

  return (
    <EventPanelContext.Provider value={openEvent}>
      <div className="dash">
        <Sidebar
          open={drawerOpen}
          section={drawerSection}
          onOpen={openDrawer}
          onClose={closeDrawer}
          user={saved.user}
          upcoming={saved.upcoming}
          past={saved.past}
          loading={saved.loading}
          onRemove={saved.removeSaved}
          onPickCategory={goToCategory}
          onSignOut={saved.signOut}
          onOpenEvent={openEvent}
        />

        <div className="dash-main">
          <SiteHeader user={saved.user} onSearch={onSearch} onAvatarClick={() => openDrawer('saved')} />
          {children}
        </div>

        <footer className="dash-footer">
          <span className="dash-logo dash-logo--light">HeyCiti</span>
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => goToCategory(c.id)}>{c.label}</button>
              </li>
            ))}
          </ul>
        </footer>

        {panelEvent && (
          <EventPanel
            key={panelEvent.ticketmaster_id}
            event={panelEvent}
            onClose={() => setPanelEvent(null)}
            isSaved={saved.isSaved}
            onToggleSave={handleToggleSave}
          />
        )}
      </div>
    </EventPanelContext.Provider>
  );
}

export default Layout;
