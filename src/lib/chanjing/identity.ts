/** 仅包含公开资源 ID，可由配置接口传给浏览器。 */
export type AvatarIdentity = { personId: string; audioManId: string };

/** public/videos 三段现有视频的实际形象/音色；审片后更换素材时一并更新。 */
export const PRESET_AVATAR: AvatarIdentity = {
  personId: "1421df93d7754ee19dcaa18e85b68f39",
  audioManId: "C-CASE-14b71dd114fb4048ac35790979df2360",
};
