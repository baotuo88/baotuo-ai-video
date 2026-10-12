package com.stonewu.fusion.service.generation.video;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.stonewu.fusion.common.BusinessException;
import com.stonewu.fusion.entity.generation.VideoTask;
import com.stonewu.fusion.infrastructure.queue.RedisTaskQueue;
import com.stonewu.fusion.mapper.generation.VideoTaskMapper;
import com.stonewu.fusion.mapper.generation.VideoItemMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VideoGenerationDeletionTests {
    private final VideoTaskMapper tasks = mock(VideoTaskMapper.class);
    private final VideoItemMapper items = mock(VideoItemMapper.class);
    private final RedisTaskQueue queue = mock(RedisTaskQueue.class);
    private final VideoGenerationService service = new VideoGenerationService(tasks, items, queue);

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void rejectsUnfinishedTask(int status) {
        task(status);
        assertThatThrownBy(() -> service.delete(7L, 2L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("生成结束");
        verifyNoInteractions(items, queue);
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3})
    void deletesFinishedTaskAndItsItems(int status) {
        task(status);
        service.delete(7L, 2L);
        verify(items).delete(any(Wrapper.class));
        verify(tasks).deleteById(7L);
        verify(queue).remove("video_generation:model:5", "task-7");
    }

    @Test
    void rejectsTerminalTaskWhileWorkerIsStillWriting() {
        task(3);
        when(queue.isRunning("video_generation:model:5", "task-7")).thenReturn(true);
        assertThatThrownBy(() -> service.delete(7L, 2L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("结束处理中");
        verifyNoInteractions(items);
    }

    @Test
    void rejectsAnotherUsersTask() {
        task(2);
        assertThatThrownBy(() -> service.delete(7L, 3L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("不存在");
        verifyNoInteractions(items, queue);
    }

    @Test
    void refusesToContinueAWorkerWhenItsStatusWriteLostToDeletion() {
        when(tasks.selectById(7L)).thenReturn(VideoTask.builder().id(7L).status(3).build());
        when(tasks.updateById(any(VideoTask.class))).thenReturn(0);
        assertThatThrownBy(() -> service.updateStatus(7L, 1, null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("已删除");
    }

    private void task(int status) {
        when(tasks.selectOne(any(Wrapper.class))).thenReturn(VideoTask.builder()
                .id(7L).userId(2L).modelId(5L).taskId("task-7").status(status).build());
    }
}
