import React, { useMemo } from "react";
import Tilt from "react-parallax-tilt";
import { Check, PencilLine, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { getCategoryName, getExpiryInfo, getConvertedWeightLabel } from "../utils/itemUtils";
import OtherImg from "../../../assets/Other.png";
import FruitsImg from "../../../assets/Fruits.png";
import VeggiesImg from "../../../assets/Vegetables.png";
import MeatImg from "../../../assets/Meat.png";
import DairyImg from "../../../assets/Dairy.png";
import BakeryImg from "../../../assets/Bakery.png";
import GrainsImg from "../../../assets/Grains.png";

const categoryImages = {
  Fruits: FruitsImg,
  Vegetables: VeggiesImg,
  Meat: MeatImg,
  Dairy: DairyImg,
  Bakery: BakeryImg,
  Grains: GrainsImg,
  Other: OtherImg,
};

const FoodCard = ({ item, currencyConfig, consumingIds = new Set(), onMarkEaten, onEdit, onDiscard }) => {
  const expInfo = getExpiryInfo(item.expiry);
  const categoryName = getCategoryName(item);
  const convertedLabel = getConvertedWeightLabel(item);

  const isTouchDevice = useMemo(() =>
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  []);

  const cardContent = (
    <div className={`food-card-aesthetic expiry-${expInfo.status}`}>
        <div className="card-inner">
          <span className={`expiry-chip ${expInfo.status}`}>{expInfo.label}</span>

          <div className="food-icon-box">
            <img
              src={categoryImages[categoryName] || item?.category?.iconUrl || OtherImg}
              alt={categoryName}
              className="category-img-card"
            />
          </div>

          <div className="food-info">
            <h3 className="inventory-item-name">{item.name}</h3>
            {convertedLabel ? <small>{convertedLabel}</small> : null}

            <div className="badge-row inventory-card-tags">
              <span className="badge qty">{item.quantity} {item.unit}</span>
              <span className="badge category">{categoryName}</span>
              <span className="badge price">
                {(item?.price === null || item?.price === undefined)
                  ? <span style={{ opacity: 0.45, fontStyle: "italic" }}>No price</span>
                  : (
                    <>
                      {formatCurrency(item?.price, currencyConfig)}
                      {item.isPriceEstimated ? (
                        <>
                          {' '}(est.)
                          <span className="est-price-hint" title="Estimated price based on category average. Add a real price to improve savings accuracy" aria-label="Estimated price based on category average">i</span>
                        </>
                      ) : null}
                    </>
                  )
                }
              </span>
            </div>

            <div className="expiry-container">
              <span className="expiry-label">EXP:</span>
              <span className="expiry-date">{item.expiry || 'N/A'}</span>
            </div>
          </div>

          <div className="card-actions-fixed">
            <button type="button" onClick={() => onMarkEaten?.(item.id)} className="act-btn check" aria-label="Mark eaten" disabled={consumingIds.has(item.id)}>
              {consumingIds.has(item.id)
                ? <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                : <Check />}
            </button>
            <button type="button" onClick={() => onEdit?.(item)} className="act-btn edit" aria-label="Edit item">
              <PencilLine />
            </button>
            <button type="button" onClick={() => onDiscard?.(item)} className="act-btn trash" aria-label="Discard item">
              <Trash2 />
            </button>
          </div>
        </div>
      </div>
  );

  if (isTouchDevice) {
    return cardContent;
  }

  return (
    <Tilt
      key={item.id}
      tiltMaxAngleX={10}
      tiltMaxAngleY={10}
      perspective={1000}
      scale={1.02}
      className="tilt-wrapper"
    >
      {cardContent}
    </Tilt>
  );
};

export default FoodCard;
