import React, { useState } from 'react';
import styles from './Timeline.module.css';

const TimelineItem = ({ item, hasNext }) => {
  const [expanded, setExpanded] = useState(item.defaultExpanded || false);

  return (
    <div className={styles.row}>
      {/* Left column: dot + connector line */}
      <div className={`${styles.spine}${hasNext ? ` ${styles.spineConnected}` : ''}`}>
        <div className={styles.dot} />
      </div>

      {/* Card */}
      <div className={styles.card}>
        {/* Clickable header */}
        <div
          className={styles.cardHeader}
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
        >
          <div className={styles.headerLeft}>
            <span className={styles.chevron}>{expanded ? '▾' : '▸'}</span>
            <div className={styles.headerText}>
              <div className={styles.title}>{item.title}</div>
              {item.subtitle && <div className={styles.subtitle}>{item.subtitle}</div>}
            </div>
          </div>
          {item.badge && (
            <div className={styles.badgeSlot} onClick={(e) => e.stopPropagation()}>
              {item.badge}
            </div>
          )}
        </div>

        {/* Expandable content */}
        {expanded && item.content && (
          <div className={styles.cardBody}>{item.content}</div>
        )}
      </div>
    </div>
  );
};

const Timeline = ({ items = [], trailing = null }) => {
  return (
    <div className={styles.timeline}>
      {items.map((item, index) => (
        <TimelineItem
          key={item.id || index}
          item={item}
          hasNext={index < items.length - 1 || !!trailing}
        />
      ))}

      {trailing && (
        <div className={styles.row}>
          <div className={styles.spine}>
            <div className={styles.dotDashed} />
          </div>
          <div className={styles.trailingText}>{trailing}</div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
