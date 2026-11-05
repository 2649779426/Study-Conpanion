import type { AvatarIdentity } from "./identity";

export type AvatarConfig = AvatarIdentity & {
  personName: string; figureType: string; width: number; height: number; audioName: string;
};

/** 晓妍原始记录绑定「带货小悦」；优先保持平台配套音色，听感由样片审定。 */
export function getAvatarConfig(): AvatarConfig {
  return {
    personId: process.env.CHANJING_PERSON_ID?.trim() || "a6d13c6ccdf342d5a3f80a79218346e5",
    personName: process.env.CHANJING_PERSON_ID?.trim() ? "自定义形象" : "晓妍-青春",
    figureType: "whole_body", width: 1080, height: 1920,
    audioManId: process.env.CHANJING_AUDIO_MAN_ID?.trim() || "C-CASE-25ae6403a1364c2ba88dad7aec4567c1",
    audioName: process.env.CHANJING_AUDIO_MAN_ID?.trim() ? "自定义音色" : "带货小悦",
  };
}

export const avatarConfig = getAvatarConfig();
