import React from "react";

const CATEGORIES = ["All", "Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Grains", "Other"];

function InventoryToolbar({ activeCategory, onCategoryChange, sortBy, onSortChange }) {
  const [isSortMenuActive, setIsSortMenuActive] = React.useState(false);

  return (
    <div className="inventory-toolbar-row">
      <div className="inventory-chip-row">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={`inventory-chip ${activeCategory === category ? "active" : ""}`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="inventory-sort-wrap">
        <span className="inventory-sort-label">Sort by:</span>
        <span className={`inventory-sort-combobox ${isSortMenuActive ? "is-open" : ""}`}>
          <select
            className={`inventory-sort-select sort-w-${sortBy}`}
            value={sortBy}
            onMouseDown={() => setIsSortMenuActive(true)}
            onBlur={() => setIsSortMenuActive(false)}
            onKeyDown={(e) => {
              if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
                setIsSortMenuActive(true);
              }
              if (e.key === "Escape") {
                setIsSortMenuActive(false);
              }
            }}
            onChange={(e) => {
              onSortChange(e.target.value);
              setIsSortMenuActive(false);
            }}
          >
            <option value="expiry">Expiry date</option>
            <option value="price-highest">Price (highest)</option>
            <option value="recent">Recently added</option>
          </select>
        </span>
      </div>
    </div>
  );
}

export { CATEGORIES };
export default InventoryToolbar;
