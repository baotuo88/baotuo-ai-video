package com.stonewu.fusion.service.generation;

import com.stonewu.fusion.entity.generation.ImageTask;
import com.stonewu.fusion.entity.generation.VideoTask;
import com.stonewu.fusion.infrastructure.queue.RedisTaskQueue;
import com.stonewu.fusion.service.generation.image.ImageGenerationService;
import com.stonewu.fusion.service.generation.video.VideoGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** 应用重启后恢复未完成的执行中任务。 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GenerationTaskRecovery {

    private final ImageGenerationService imageGenerationService;
    private final VideoGenerationService videoGenerationService;
    private final RedisTaskQueue taskQueue;

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterruptedTasks() {
        recoverImages();
        recoverVideos();
    }

    private void recoverImages() {
        for (ImageTask task : imageGenerationService.findPendingTasks()) {
            if (!Integer.valueOf(1).equals(task.getStatus())) {
                continue;
            }
            String queueName = "image_generation:model:" + task.getModelId();
            if (taskQueue.isRunning(queueName, task.getTaskId())) {
                continue;
            }
            if (imageGenerationService.updateStatusIfCurrent(task.getId(), 1, 0,
                    "应用重启后任务恢复")) {
                try {
                    taskQueue.push(queueName, task.getTaskId());
                    log.info("[GenerationRecovery] 恢复图片任务: taskId={}", task.getTaskId());
                } catch (Exception e) {
                    imageGenerationService.updateStatusIfCurrent(task.getId(), 0, 3,
                            "任务恢复入队失败: " + e.getMessage());
                    log.error("[GenerationRecovery] 图片任务恢复入队失败: taskId={}", task.getTaskId(), e);
                }
            }
        }
    }

    private void recoverVideos() {
        for (VideoTask task : videoGenerationService.findPendingTasks()) {
            if (!Integer.valueOf(1).equals(task.getStatus())) {
                continue;
            }
            String queueName = "video_generation:model:" + task.getModelId();
            if (taskQueue.isRunning(queueName, task.getTaskId())) {
                continue;
            }
            if (videoGenerationService.updateStatusIfCurrent(task.getId(), 1, 0,
                    "应用重启后任务恢复")) {
                try {
                    taskQueue.push(queueName, task.getTaskId());
                    log.info("[GenerationRecovery] 恢复视频任务: taskId={}", task.getTaskId());
                } catch (Exception e) {
                    videoGenerationService.updateStatusIfCurrent(task.getId(), 0, 3,
                            "任务恢复入队失败: " + e.getMessage());
                    log.error("[GenerationRecovery] 视频任务恢复入队失败: taskId={}", task.getTaskId(), e);
                }
            }
        }
    }
}
