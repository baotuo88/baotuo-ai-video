import type { SceneWithItems } from "./storyboard-types";

/** 保留未变化场次与镜头的引用，后台刷新不会重建整个工作区。 */
export function reconcileStoryboardGroups(previous: SceneWithItems[], next: SceneWithItems[]): SceneWithItems[] {
  const bySceneId = new Map(previous.map((group) => [group.scene.id, group]));
  const groups = next.map((group) => {
    const old = bySceneId.get(group.scene.id);
    if (!old) return group;
    const byItemId = new Map(old.items.map((item) => [item.id, item]));
    const items = group.items.map((item) => {
      const oldItem = byItemId.get(item.id);
      return oldItem && JSON.stringify(oldItem) === JSON.stringify(item) ? oldItem : item;
    });
    const unchangedItems = items.length === old.items.length && items.every((item, index) => item === old.items[index]);
    const unchangedScene = JSON.stringify(old.scene) === JSON.stringify(group.scene);
    return unchangedItems && unchangedScene ? old : { scene: unchangedScene ? old.scene : group.scene, items };
  });
  return groups.length === previous.length && groups.every((group, index) => group === previous[index])
    ? previous
    : groups;
}
