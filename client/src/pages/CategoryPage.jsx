import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import EventGrid from '../components/EventGrid.jsx';
import PopularCarousel from '../components/PopularCarousel.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { ArrowLeft, CloseIcon } from '../components/Icons.jsx';
import useSavedEvents, { useSaveHandler } from '../hooks/useSavedEvents.js';
import useUserLocation from '../hooks/useUserLocation.js';
import { CATEGORIES, findCategory } from '../utils/categories.js';
import './CategoryPage.css';

// /category/:categoryId, for example /category/music
function CategoryPage() {
  const { categoryId } = useParams();
  const category = findCategory(categoryId);

  // Unknown category in the URL: send them back to the dashboard.
  if (!category) return <Navigate to="/dashboard" replace />;

  // The key resets the search when switching from one category to another.
  return <CategoryContent key={category.id} category={category} />;
}

function CategoryContent({ category }) {
  const navigate = useNavigate();
  const saved = useSavedEvents();
  const handleToggleSave = useSaveHandler(saved, navigate);
  const loc = useUserLocation();
  const [keyword, setKeyword] = useState('');

  const baseParams = { ...loc.params, ...category.params };
  // A typed search adds to the category's own keyword (Food & Culture uses one).
  const gridParams = { ...baseParams, keyword: [category.params.keyword, keyword].filter(Boolean).join(' ') };

  return (
    <Layout saved={saved} onSearch={setKeyword}>
      {/* Category banner */}
      <section className="cat-hero" style={{ '--cat-color': category.color }}>
        <Link to="/dashboard#categories" className="cat-hero__back">
          <ArrowLeft width={18} height={18} /> All categories
        </Link>
        <h1>{category.label}</h1>
        <p>{category.blurb}</p>

        <nav className="cat-switcher" aria-label="Other categories">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/category/${c.id}`} className={`chip ${c.id === category.id ? 'is-active' : ''}`} aria-current={c.id === category.id ? 'page' : undefined}>
              {c.label}
            </Link>
          ))}
        </nav>
      </section>

      <PopularCarousel title={`Popular In ${category.label}`} id="popular" params={baseParams} saved={saved} onToggleSave={handleToggleSave} />

      <EventGrid
        id="events"
        params={gridParams}
        saved={saved}
        onToggleSave={handleToggleSave}
        emptyText={`No ${category.label.toLowerCase()} events match these filters. Try another date or a wider area.`}
        heading={
          <div className="grid-heading">
            <h2 className="dash-heading">All Events {loc.headingPlace}</h2>
            <LocationPicker loc={loc} />
          </div>
        }
        activeChips={
          keyword && (
            <button type="button" className="chip chip--removable" onClick={() => setKeyword('')}>
              &ldquo;{keyword}&rdquo; <CloseIcon width={14} height={14} />
            </button>
          )
        }
      />
    </Layout>
  );
}

export default CategoryPage;
