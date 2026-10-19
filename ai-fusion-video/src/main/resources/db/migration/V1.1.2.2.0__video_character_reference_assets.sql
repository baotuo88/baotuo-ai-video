ALTER TABLE `afv_video_task`
  ADD COLUMN `character_asset_item_ids` json NULL COMMENT '角色参考子资产ID列表JSON' AFTER `reference_image_urls`;
