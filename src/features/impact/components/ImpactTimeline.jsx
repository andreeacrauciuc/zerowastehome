import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { AlertTriangle, Leaf, Star } from "lucide-react";
import { DAY_LABEL, formatCurrency } from "../utils/formatters";
import { useCurrency } from "../../../hooks/useCurrency";
import { useImpactMotion } from "../hooks/useImpactMotion";

const MotionSection = motion.section;

const PAGE_SIZE = 20;

const TYPE_META = {
  saved: { className: "is-saved", Icon: Star, label: "Saved", sign: "+" },
  eaten: { className: "is-saved", Icon: Leaf, label: "Eaten", sign: "+" },
  wasted: { className: "is-wasted", Icon: AlertTriangle, label: "Wasted", sign: "-" },
};

const resolveMeta = (event) => {
  if (event.type === "saved" && event.rawStatus === "eaten") return TYPE_META.eaten;
  return TYPE_META[event.type] || TYPE_META.saved;
};

const ImpactTimeline = ({ events }) => {
  const { currencyConfig } = useCurrency();
  const { cardMotion } = useImpactMotion();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevEvents, setPrevEvents] = useState(events);
  if (prevEvents !== events) {
    setPrevEvents(events);
    setVisibleCount(PAGE_SIZE);
  }

  const visibleEvents = useMemo(
    () => events.slice(0, visibleCount),
    [events, visibleCount],
  );

  if (events.length === 0) {
    return (
      <MotionSection
        className="glass-card impact-timeline-card"
        initial="rest"
        whileHover="hover"
        variants={cardMotion}
      >
        <div className="section-head">
          <h3>Impact timeline</h3>
          <p>Every item you saved, ate, or lost will appear here.</p>
        </div>
        <p className="empty-text">No activity yet. Mark items as eaten, saved, or wasted to build your timeline.</p>
      </MotionSection>
    );
  }

  return (
    <MotionSection
      className="glass-card impact-timeline-card"
      initial="rest"
      whileHover="hover"
      variants={cardMotion}
    >
      <div className="section-head">
        <h3>Impact timeline</h3>
        <p>Your most recent food decisions, newest first</p>
      </div>

      <ol className="impact-timeline">
        {visibleEvents.map((event, index) => {
          const meta = resolveMeta(event);
          const { Icon } = meta;
          return (
            <li
              key={event.id}
              className={`timeline-item ${meta.className}`}
              style={{ "--index": index % PAGE_SIZE }}
            >
              <span className="timeline-dot" aria-hidden="true">
                <Icon size={14} />
              </span>
              <div className="timeline-body">
                <div className="timeline-row">
                  <strong className="timeline-name">{event.name}</strong>
                  <span className={`timeline-value ${meta.className}`}>
                    {meta.sign}
                    {formatCurrency(event.value, currencyConfig)}
                  </span>
                </div>
                <div className="timeline-meta">
                  <span className="timeline-tag">{meta.label}</span>
                  <span className="timeline-date">
                    {event.when ? DAY_LABEL.format(event.when) : "Recent"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {visibleCount < events.length && (
        <button
          type="button"
          className="timeline-load-more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Load more ({events.length - visibleCount} left)
        </button>
      )}
    </MotionSection>
  );
};

ImpactTimeline.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      rawStatus: PropTypes.string,
      value: PropTypes.number,
      when: PropTypes.instanceOf(Date),
    }),
  ).isRequired,
};

export default ImpactTimeline;
