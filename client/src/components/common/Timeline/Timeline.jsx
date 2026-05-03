import React, { useState } from 'react';
import styles from './Timeline.module.css';

const TimelineItem = ({ item, index }) => {
  const [expanded, setExpanded] = useState(item.defaultExpanded || false);

  return (
    <div className={styles.item}>
      <div className={styles.dotWrapper}>
        <div className={styles.dot} />
        {!item.isLast && <div className={styles.line} />}
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
          <div className={styles.headerLeft}>
            <span className={styles.chevron}>{expanded ? '▾' : '▸'}</span>
            <div>
              <div className={styles.title}>{item.title}</div>
              {item.subtitle && <div className={styles.subtitle}>{item.subtitle}</div>}
            </div>
          </div>
          {item.badge && <div className={styles.badgeSlot}>{item.badge}</div>}
        </div>
        {expanded && item.content && (
          <div className={styles.cardContent}>{item.content}</div>
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
          item={{ ...item, isLast: index === items.length - 1 && !trailing }}
          index={index}
        />
      ))}
      {trailing && (
        <div className={styles.item}>
          <div className={styles.dotWrapper}>
            <div className={styles.dotDashed} />
          </div>
          <div className={styles.trailing}>{trailing}</div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
