import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from './Icons.jsx';

// Logo, search box and nav links shared by every browsing page.
function SiteHeader({ user, onSearch, onAvatarClick, searchPlaceholder = 'Search events, artists, venues' }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(text.trim());
  }

  return (
    <header className="dash-header">
      <Link to="/dashboard" className="dash-logo">HeyCiti</Link>

      <form className="dash-search" onSubmit={handleSubmit} role="search">
        <SearchIcon width={18} height={18} />
        <input type="search" placeholder={searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} aria-label="Search events" />
      </form>

      <nav className="dash-nav" aria-label="Main">
        <Link to="/dashboard#categories">Categories</Link>
        <Link to="/dashboard#events">Find Events</Link>
        {user ? (
          <button type="button" className="dash-avatar" onClick={onAvatarClick} aria-label="Open your saved events">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : user.email[0].toUpperCase()}
          </button>
        ) : (
          <>
            <Link to="/login">Sign In</Link>
            <Link to="/login" className="dash-avatar" aria-label="Sign in" />
          </>
        )}
      </nav>
    </header>
  );
}

export default SiteHeader;
