import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Pagination.module.css';

/**
 * Pagination component for navigating through pages of data
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = '',
}) => {
  // Generate array of pages to be displayed
  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3; // Include current page, first page, last page, and siblings
    const totalBlocks = totalNumbers + 2; // Add 2 for the '...' blocks

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 1 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);

      return [...leftRange, 'right-dots', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 1 + 2 * siblingCount;
      let rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );

      return [firstPageIndex, 'left-dots', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );

      return [firstPageIndex, 'left-dots', ...middleRange, 'right-dots', lastPageIndex];
    }
  };

  const pages = getPageNumbers();

  const handlePageChange = (page) => {
    if (page === currentPage) return;
    onPageChange(page);
  };

  return (
    <div className={classNames(styles.pagination, className)}>
      <button
        className={styles.pageItem}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        &laquo;
      </button>
      
      {pages.map((page, index) => {
        if (page === 'left-dots' || page === 'right-dots') {
          return (
            <span key={index} className={styles.ellipsis}>
              &hellip;
            </span>
          );
        }

        return (
          <button
            key={index}
            className={classNames(styles.pageItem, {
              [styles.active]: page === currentPage,
            })}
            onClick={() => handlePageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        );
      })}
      
      <button
        className={styles.pageItem}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        &raquo;
      </button>
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  siblingCount: PropTypes.number,
  className: PropTypes.string,
};

export default Pagination; 