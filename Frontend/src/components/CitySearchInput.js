import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CitySearchInput.css';

/**
 * Searchable city dropdown — replaces plain <select>.
 *
 * Props:
 *   value      {string}   – selected city name (controlled)
 *   onChange   {fn}       – called with the chosen city string
 *   cities     {string[]} – full city list from API
 *   placeholder {string}
 *   id         {string}   – for <label htmlFor>
 */
function CitySearchInput({ value, onChange, cities = [], placeholder = 'Search city...', id }) {
  const [query, setQuery]       = useState('');      // what the user typed
  const [open, setOpen]         = useState(false);
  const [highlighted, setHigh]  = useState(-1);
  const containerRef            = useRef(null);
  const inputRef                = useRef(null);
  const listRef                 = useRef(null);

  // When the controlled value changes externally, reset query to empty so the
  // display shows the selected city label (not whatever the user typed before).
  useEffect(() => {
    setQuery('');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter cities: case-insensitive substring match; max 50 results
  const filtered = query.trim()
    ? cities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : cities.slice(0, 80); // show first 80 when no query

  const select = useCallback((city) => {
    onChange(city);
    setOpen(false);
    setQuery('');
    setHigh(-1);
  }, [onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        setOpen(true);
        setHigh(0);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        setHigh(h => Math.min(h + 1, filtered.length - 1));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHigh(h => Math.max(h - 1, 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (highlighted >= 0 && filtered[highlighted]) {
          select(filtered[highlighted]);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setOpen(false);
        setQuery('');
        setHigh(-1);
        break;
      default:
        break;
    }
  };

  const displayValue = value || '';

  return (
    <div className="csi-wrapper" ref={containerRef}>
      <div
        className={`csi-control${open ? ' csi-open' : ''}${displayValue ? ' csi-has-value' : ''}`}
        onClick={() => {
          setOpen(o => !o);
          setHigh(0);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        id={id}
      >
        {/* Show selected city or placeholder */}
        {!open && (
          <span className={`csi-display-text${!displayValue ? ' csi-placeholder' : ''}`}>
            {displayValue || placeholder}
          </span>
        )}

        {/* While open, show the text input */}
        {open && (
          <input
            ref={inputRef}
            className="csi-input"
            value={query}
            onChange={e => { setQuery(e.target.value); setHigh(0); }}
            onKeyDown={handleKeyDown}
            placeholder={displayValue || placeholder}
            autoFocus
            onClick={e => e.stopPropagation()} // prevent closing on input click
          />
        )}

        <span className={`csi-arrow${open ? ' csi-arrow-up' : ''}`}>▾</span>
      </div>

      {open && (
        <ul
          className="csi-dropdown"
          role="listbox"
          ref={listRef}
        >
          {filtered.length === 0 && (
            <li className="csi-no-result">No cities found</li>
          )}
          {filtered.map((city, idx) => (
            <li
              key={city}
              role="option"
              aria-selected={city === value}
              className={
                `csi-option` +
                (city === value   ? ' csi-selected'     : '') +
                (idx === highlighted ? ' csi-highlighted' : '')
              }
              onMouseDown={e => { e.preventDefault(); select(city); }}
              onMouseEnter={() => setHigh(idx)}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CitySearchInput;
