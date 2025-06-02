import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Tabs.module.css';

const Tabs = ({ tabs, activeTab, onTabChange, className, ...props }) => {
  return (
    <div className={classNames(styles.tabsContainer, className)} {...props}>
      <div className={styles.tabsList}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={classNames(styles.tabButton, {
              [styles.active]: activeTab === tab.id,
            })}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default Tabs; 