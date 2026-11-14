import React, { useState, useEffect, useMemo, useRef } from 'react';
import { searchLearners } from '../core/learners/learnerMatcher.js';
import { SearchIcon, XIcon } from '../Icons.jsx';

export default function GlobalSearchBar({ learners, schoolMemory, onSelectLearner }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchLearners(learners, query).slice(0, 8);
  }, [learners, query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (learnerId) => {
    onSelectLearner(learnerId);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="global-search-container" ref={containerRef}>
      <div className="global-search-input-wrapper">
        <span className="search-icon">
          <SearchIcon size={15} />
        </span>
        <input
          type="text"
          className="global-search-input"
          placeholder="Search by admission no (e.g. 3021), name part (e.g. Mwan), or class..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
        />
        {query && (
          <button className="search-clear-btn" onClick={() => setQuery('')}>
            <XIcon size={12} />
          </button>
        )}
      </div>

      {/* Instant Dropdown Suggestions */}
      {isOpen && query.trim() && (
        <div className="search-dropdown">
          {results.length > 0 ? (
            results.map((l) => {
              const mem = schoolMemory.assembleLearnerMemory(l.id);
              const att = mem?.attendance;
              return (
                <div
                  key={l.id}
                  className="search-dropdown-item"
                  onClick={() => handleSelect(l.id)}
                >
                  <div className="search-item-info">
                    <span className="search-item-name">{l.fullName}</span>
                    <span className="search-item-class">{l.className}{l.section ? ` (${l.section})` : ''}</span>
                    {l.admissionNumber && (
                      <span className="search-item-adm">Adm: {l.admissionNumber}</span>
                    )}
                    {l.guardianName && (
                      <span className="search-item-adm" style={{ opacity: 0.8 }}>Parent: {l.guardianName}</span>
                    )}
                  </div>
                  <div className="search-item-badge">
                    <span className={`badge-pill ${att && att.percentage >= 85 ? 'badge-good' : 'badge-warn'}`}>
                      {att && att.totalSchoolDays > 0 ? `${att.percentage}% Att.` : 'Present'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="search-dropdown-empty">
              No learner matching "<strong>{query}</strong>". Try a name fragment or admission digits.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
