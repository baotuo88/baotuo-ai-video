package com.stonewu.fusion.service.system;

import com.stonewu.fusion.controller.system.vo.VersionInfoRespVO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class VersionReleaseConfigurationTests {

    @Test
    void missingImageRepositoriesDoNotCheckUpstreamOrAdvertiseAnUpdate() {
        VersionCheckService service = new VersionCheckService(null, new MockEnvironment());
        VersionInfoRespVO response = service.getVersionInfo(true);

        assertThat(response.getCheckSucceeded()).isFalse();
        assertThat(response.getUpdateAvailable()).isFalse();
        assertThat(response.getMessage()).contains("BACKEND_IMAGE_REPOSITORY");
        assertThat(response.getReleaseUrl()).isEqualTo("https://github.com/baotuo88/baotuo-ai-video/releases");
    }

    @Test
    void registryUrlsAndImageTagsAreRejectedAsRepositoryNames() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.release.backend-image-repository", "https://hub.docker.com/example/backend")
                .withProperty("app.release.frontend-image-repository", "example/frontend:latest");
        VersionCheckService service = new VersionCheckService(null, environment);

        assertThat(service.getVersionInfo(true).getCheckSucceeded()).isFalse();
    }
}
