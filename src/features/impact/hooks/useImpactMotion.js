import { useReducedMotion } from "framer-motion";
import {
  cardMotion,
  cardMotionReduced,
  pageMotion,
  pageMotionReduced,
} from "../utils/constants";

export const useImpactMotion = () => {
  const reduced = useReducedMotion();
  return {
    reduced: Boolean(reduced),
    pageMotion: reduced ? pageMotionReduced : pageMotion,
    cardMotion: reduced ? cardMotionReduced : cardMotion,
  };
};
