import { FEATURE_FLAG } from "@/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

export const useFeatureFlag = () => {
  return {
    isNewAuthDesign: useFeatureIsOn(FEATURE_FLAG.NEW_AUTH_KEY),
  };
};
