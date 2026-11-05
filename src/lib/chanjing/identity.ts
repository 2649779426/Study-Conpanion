/** 仅包含公开资源 ID，可由配置接口传给浏览器。 */
export type AvatarIdentity = { personId: string; audioManId: string };

/** public/videos 三段现有视频的实际形象/音色；审片后更换素材时一并更新。 */
export const PRESET_AVATAR: AvatarIdentity = {
  personId: "a6d13c6ccdf342d5a3f80a79218346e5",
  audioManId: "C-CASE-25ae6403a1364c2ba88dad7aec4567c1",
};
