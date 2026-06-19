import { useCallback } from "react";
import { useMotionValue, useTransform } from "framer-motion";

export function useAuthCardTilt() {
  const maxTilt = 24;

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const shadowX = useTransform(rotateY, [-maxTilt, maxTilt], [-32, 32]);
  const shadowY = useTransform(rotateX, [-maxTilt, maxTilt], [32, -32]);

  const boxShadow = useTransform(
    [shadowX, shadowY],
    ([x, y]) => `${x}px ${y}px 80px rgba(35, 45, 39, 0.28)`
  );

  const handlePointerMove = useCallback(
    (event) => {
      const card = event.currentTarget;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      rotateY.set((px - 0.5) * maxTilt);
      rotateX.set((0.5 - py) * maxTilt);
    },
    [maxTilt, rotateX, rotateY]
  );

  const handlePointerLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return {
    cardMotionStyle: { rotateX, rotateY, boxShadow },
    handlePointerMove,
    handlePointerLeave,
  };
}
