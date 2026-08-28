import { Dispatch, SetStateAction } from "react";

export const useCanScroll = () => {
  const canScroll = (
    e: Event,
    isCanScroll: boolean,
    dispath: Dispatch<SetStateAction<boolean>>,
  ): void => {
    if (window.scrollY > 400 && !isCanScroll) {
      dispath(true);
    } else if (window.scrollY < 400 && isCanScroll) {
      dispath(false);
    }
  };

  return {
    canScroll,
  };
};
