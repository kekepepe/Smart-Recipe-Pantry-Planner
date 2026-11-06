# V1 开发版交付状态

状态：V1 本机受控开发基线，位于 `feat/v1-core`；尚非团队正式发布或 main 已合并声明。

计划先行提交：`c86f67b`，已推送。后续实现包含 Express/SQLite、事务库存/单菜清单、HTTP 页面、20 菜目录/图片、运行恢复工具、自动验收及三平台 CI。实现 SHA 以本文件所在实现提交为准。

已在本机通过的检查见 [V1-ACCEPTANCE](V1-ACCEPTANCE.md)，启动/备份/恢复见 [V1-RUNBOOK](V1-RUNBOOK.md)，菜谱来源见 [RECIPE-CATALOG](RECIPE-CATALOG.md)。数据库、个人配置、备份、node_modules、dist、临时浏览器结果不随源码提交。

尚需实际完成：

- 分支最终 SHA 的远端 CI（Linux/Mac/Windows），以 Actions 实际结果为准。
- Peng 与 ChangPeng 对业务的交叉评审，以及 Hao 对迁移/事务/恢复的复核。
- 第二成员新目录复现与真实用户评价；不得归为 Codex 已替成员完成。
- Mao 依据最终证据组织发布评审，核对无阻断缺陷后再合入/标记正式版本。

本次 GitHub 插件尝试建立草稿 PR 时返回 403 Resource not accessible by integration；不影响经已授权 Git 连接推送分支。分支可通过 GitHub compare 页面由有权限者创建 PR；此状态不等同自动审批拒绝，也不是代码上传失败。

当前没有开启公网共享运行。若需要多人试用，按 V1 计划第 12 节单独交付会话与 workspace 隔离、HTTPS、持久磁盘、自启动及离机恢复，并留下两组凭据的访问隔离证据。
