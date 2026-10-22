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
import org.springframework.scheduling.annotation.Scheduled;
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
        recoverTasks();
    }

    @Scheduled(fixedDelay = 60000)
    public void recoverLostTasks() {
        recoverTasks();
    }

    private void recoverTasks() {
        recoverImages();
        recoverVideos();
    }

    private void recoverImages() {
        for (ImageTask task : imageGenerationService.findPendingTasks()) {
            if (!Integer.valueOf(0).equals(task.getStatus()) && !Integer.valueOf(1).equals(task.getStatus())) {
                continue;
            }
            String queueName = "image_generation:model:" + task.getModelId();
            if (taskQueue.isQueued(queueName, task.getTaskId()) || taskQueue.isRunning(queueName, task.getTaskId())) {
                continue;
            }
            if (Integer.valueOf(1).equals(task.getStatus())) {
                imageGenerationService.updateStatusIfCurrent(task.getId(), 1, 0, "执行租约过期，任务恢复排队");
            }
            try {
                if (taskQueue.requeueIfLost(queueName, task.getTaskId())) {
                    log.info("[GenerationRecovery] 恢复图片任务: taskId={}", task.getTaskId());
                }
            } catch (Exception e) {
                log.error("[GenerationRecovery] 图片任务恢复入队失败: taskId={}", task.getTaskId(), e);
            }
        }
    }

    private void recoverVideos() {
        for (VideoTask task : videoGenerationService.findPendingTasks()) {
            if (!Integer.valueOf(0).equals(task.getStatus()) && !Integer.valueOf(1).equals(task.getStatus())) {
                continue;
            }
            String queueName = "video_generation:model:" + task.getModelId();
            if (taskQueue.isQueued(queueName, task.getTaskId()) || taskQueue.isRunning(queueName, task.getTaskId())) {
                continue;
            }
            if (Integer.valueOf(1).equals(task.getStatus())) {
                videoGenerationService.updateStatusIfCurrent(task.getId(), 1, 0, "执行租约过期，任务恢复排队");
            }
            try {
                if (taskQueue.requeueIfLost(queueName, task.getTaskId())) {
                    log.info("[GenerationRecovery] 恢复视频任务: taskId={}", task.getTaskId());
                }
            } catch (Exception e) {
                log.error("[GenerationRecovery] 视频任务恢复入队失败: taskId={}", task.getTaskId(), e);
            }
        }
    }
}
