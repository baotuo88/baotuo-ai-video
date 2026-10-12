ALTER TABLE afv_storyboard_episode
    ADD COLUMN bgm_task_id VARCHAR(64) NULL COMMENT 'Sonilo 配乐任务ID（如需查询该音轨的授权记录，凭此ID向 Sonilo 查询）',
    ADD COLUMN bgm_audio_url VARCHAR(512) NULL COMMENT '配乐音轨URL（持久化存档）',
    ADD COLUMN bgm_sfx_audio_url VARCHAR(512) NULL COMMENT '音效音轨URL（持久化存档）',
    ADD COLUMN bgm_error_msg VARCHAR(1024) NULL COMMENT '配乐失败原因（配乐失败不影响本集合成结果）';
