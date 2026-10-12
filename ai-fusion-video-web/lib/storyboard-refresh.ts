type ScheduleRefresh = (callback: () => void) => () => void;

const scheduleAfterQuietPeriod: ScheduleRefresh = (callback) => {
  const timer = setTimeout(callback, 200);
  return () => clearTimeout(timer);
};

/** 合并失效事件，在当前项目任务结束后刷新；刷新期间的新事件不会丢失。 */
export function createStoryboardRefreshCoordinator(
  refresh: () => Promise<void>,
  schedule: ScheduleRefresh = scheduleAfterQuietPeriod,
) {
  let dirty = false;
  let running = false;
  let refreshing = false;
  let disposed = false;
  let cancelPending: (() => void) | undefined;

  const plan = () => {
    cancelPending?.();
    cancelPending = undefined;
    if (disposed || running || refreshing || !dirty) return;
    cancelPending = schedule(() => {
      cancelPending = undefined;
      if (disposed || running || refreshing || !dirty) return;
      dirty = false;
      refreshing = true;
      void Promise.resolve().then(refresh).catch((error) => {
        console.error("刷新分镜数据失败", error);
      }).finally(() => {
        refreshing = false;
        plan();
      });
    });
  };

  return {
    update(invalidated: boolean, hasRunningTask: boolean) {
      const runningChanged = running !== hasRunningTask;
      dirty ||= invalidated;
      running = hasRunningTask;
      if (invalidated || runningChanged) plan();
    },
    dispose() {
      disposed = true;
      cancelPending?.();
    },
  };
}
