import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useImpactMotion } from "../hooks/useImpactMotion";
import customTrophyImg from "../../../assets/trophy.png";
import ecoHeroIcon from "../../../assets/eco-hero.png";
import efficientCookIcon from "../../../assets/efficient-cook.png";
import budgetIcon from "../../../assets/budget-saver.png";
import zeroWasteIcon from "../../../assets/zero-waste-logo.png";
import "../../../styles/features/impact/ImpactBadges.scss";

const MotionSection = motion.section;
const MotionDiv = motion.div;

const BADGE_ICONS = {
  co2_hero: ecoHeroIcon,
  chef: efficientCookIcon,
  zero_waste: zeroWasteIcon,
  budget: budgetIcon,
};

const BADGE_THEMES = {
  co2_hero: { border: "#4f8061", bgFrom: "#ffffff", bgTo: "#eef3ee", title: "#1f4d2e", shadow: "rgba(31, 77, 46, 0.38)" },
  chef: { border: "#9a6b2f", bgFrom: "#ffffff", bgTo: "#f6f1e7", title: "#6b4a1f", shadow: "rgba(154, 107, 47, 0.38)" },
  zero_waste: { border: "#4f7d7a", bgFrom: "#ffffff", bgTo: "#eef3f2", title: "#274d4a", shadow: "rgba(39, 77, 74, 0.38)" },
  budget: { border: "#8a4f5e", bgFrom: "#ffffff", bgTo: "#f4edef", title: "#5e1a28", shadow: "rgba(94, 26, 40, 0.38)" },
};

const DEFAULT_THEME = { border: "#4f8061", bgFrom: "#ffffff", bgTo: "#eef3ee", title: "#1f4d2e", shadow: "rgba(31, 77, 46, 0.34)" };

export function ImpactBadgesSection({ badges }) {
  const { reduced } = useImpactMotion();
  if (!badges || badges.length === 0) return null;

  return (
    <MotionSection
      className="glass-card badges-section"
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={reduced ? false : { opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.5 }}
    >
      <div className="section-head">
        <img src={customTrophyImg} alt="" className="section-head-icon" />
        <div>
          <h3>Achievements unlocked</h3>
          <p>Milestones you&apos;ve earned by reducing waste</p>
        </div>
      </div>

      <div className="badges-grid">
        {badges.map((badge) => {
          const IconComponent = BADGE_ICONS[badge.id] || Trophy;
          const isImageIcon = typeof IconComponent === "string";
          const themeKey = badge.id in BADGE_THEMES ? badge.id : "default";
          const theme = BADGE_THEMES[badge.id] || DEFAULT_THEME;
          return (
            <MotionDiv
              key={badge.id}
              className={`badge-tile badge-tile--${themeKey}`}
              style={{
                "--badge-border": theme.border,
                "--badge-bg-from": theme.bgFrom,
                "--badge-bg-to": theme.bgTo,
                "--badge-title-color": theme.title,
                "--badge-shadow-color": theme.shadow,
              }}
              whileHover={reduced ? undefined : { y: -4, scale: 1.02 }}
            >
              <div className="badge-icon-wrap">
                {isImageIcon ? (
                  <img src={IconComponent} alt="" className="badge-icon-img" />
                ) : (
                  <IconComponent size={28} />
                )}
              </div>
              <div className="badge-text">
                <strong>{badge.title}</strong>
                <span>{badge.desc}</span>
              </div>
            </MotionDiv>
          );
        })}
      </div>
    </MotionSection>
  );
}

ImpactBadgesSection.propTypes = {
  badges: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      iconId: PropTypes.string,
      title: PropTypes.string.isRequired,
      desc: PropTypes.string.isRequired,
    })
  ),
};

export default ImpactBadgesSection;
