package com.stonewu.fusion.service.generation.video.consumer;

import com.stonewu.fusion.entity.ai.ApiConfig;
import com.stonewu.fusion.entity.generation.VideoItem;
import com.stonewu.fusion.entity.generation.VideoTask;
import com.stonewu.fusion.infrastructure.queue.RedisTaskQueue;
import com.stonewu.fusion.service.ai.AiModelService;
import com.stonewu.fusion.service.ai.ApiConfigService;
import com.stonewu.fusion.service.ai.comfyui.ComfyUiWorkflowService;
import com.stonewu.fusion.service.generation.GenerationModelCapabilityService;
import com.stonewu.fusion.service.generation.ReferenceImageTransportService;
import com.stonewu.fusion.service.generation.video.VideoFrameExtractor;
import com.stonewu.fusion.service.generation.video.VideoGenerationService;
import com.stonewu.fusion.service.generation.video.strategy.VideoGenerationStrategyRouter;
import com.stonewu.fusion.service.storage.MediaStorageService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProtectedVideoPersistenceTests {

    @Test
    void persistsSameOriginProtectedVideoWithProviderBearerToken() throws Exception {
        byte[] videoBytes = "protected-video-bytes".getBytes(StandardCharsets.UTF_8);
        AtomicReference<String> authorization = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/videos/task_123/content", exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            exchange.getResponseHeaders().add("Content-Type", "video/mp4");
            exchange.sendResponseHeaders(200, videoBytes.length);
            try (var output = exchange.getResponseBody()) {
                output.write(videoBytes);
            }
        });
        server.start();

        VideoGenerationService videoGenerationService = mock(VideoGenerationService.class);
        MediaStorageService mediaStorageService = mock(MediaStorageService.class);
        VideoFrameExtractor videoFrameExtractor = mock(VideoFrameExtractor.class);
        VideoTask task = VideoTask.builder().id(201L).build();
        String remoteUrl = "http://localhost:" + server.getAddress().getPort()
                + "/v1/videos/task_123/content";
        VideoItem item = VideoItem.builder()
                .id(301L)
                .taskId(201L)
                .videoUrl(remoteUrl)
                .build();
        ApiConfig apiConfig = ApiConfig.builder()
                .apiUrl("http://localhost:" + server.getAddress().getPort() + "/v1/video/generations")
                .apiKey("test-key")
                .build();

        when(videoGenerationService.listItems(201L)).thenReturn(List.of(item));
        when(mediaStorageService.storeFile(any(Path.class), eq("videos"), eq("mp4")))
                .thenReturn("/media/videos/generated.mp4");
        when(videoFrameExtractor.extract("/media/videos/generated.mp4", true, true))
                .thenReturn(new VideoFrameExtractor.ExtractedFrames(null, null));

        VideoGenerationConsumer consumer = new VideoGenerationConsumer(
                mock(RedisTaskQueue.class),
                videoGenerationService,
                mock(AiModelService.class),
                mock(ApiConfigService.class),
                mock(GenerationModelCapabilityService.class),
                mock(ReferenceImageTransportService.class),
                mock(VideoGenerationStrategyRouter.class),
                mediaStorageService,
                videoFrameExtractor,
                mock(ComfyUiWorkflowService.class)
        );

        try {
            consumer.persistVideoItems(task, apiConfig);

            assertThat(authorization.get()).isEqualTo("Bearer test-key");
            assertThat(item.getVideoUrl()).isEqualTo("/media/videos/generated.mp4");
            verify(mediaStorageService).storeFile(any(Path.class), eq("videos"), eq("mp4"));
            verify(videoGenerationService).updateItem(item);
        } finally {
            consumer.shutdownWorkerExecutor();
            server.stop(0);
        }
    }
}
