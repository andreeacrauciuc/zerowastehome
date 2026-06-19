import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import PropTypes from "prop-types";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const CountUp = ({
  value,
  formatter = (num) => Number(num).toFixed(0),
  duration = 1000,
  animateOnMount = true,
}) => {
  const [display, setDisplay] = useState(0);
  const hasMounted = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;

    if (hasMounted.current || !animateOnMount || prefersReducedMotion) {
      setDisplay(target);
      hasMounted.current = true;
      return undefined;
    }

    let frame = null;
    let start = null;

    const animate = (time) => {
      if (!start) start = time;
      const progress = clamp((time - start) / duration, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(target * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        hasMounted.current = true;
      }
    };

    frame = requestAnimationFrame(animate);
    return () => frame && cancelAnimationFrame(frame);
  }, [duration, value, animateOnMount, prefersReducedMotion]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' }}>
      {formatter(display)}
    </span>
  );
};

CountUp.propTypes = {
  value: PropTypes.number.isRequired,
  formatter: PropTypes.func,
  duration: PropTypes.number,
  animateOnMount: PropTypes.bool,
};

export default CountUp;
