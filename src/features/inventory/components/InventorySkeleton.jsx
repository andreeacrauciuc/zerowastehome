import React from "react";

function InventorySkeleton() {
  return (
    <div className="fixed-items-grid" aria-label="Loading inventory" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`inventory-skeleton-${index}`} className="inventory-skeleton-card">
          <div className="skeleton-shimmer skeleton-icon" />
          <div className="skeleton-body">
            <div className="skeleton-shimmer skeleton-line skeleton-title" />
            <div className="skeleton-tags">
              <div className="skeleton-shimmer skeleton-pill" />
              <div className="skeleton-shimmer skeleton-pill" />
            </div>
            <div className="skeleton-shimmer skeleton-line skeleton-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default InventorySkeleton;
