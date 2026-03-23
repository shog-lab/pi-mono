# Fork 工作规则

这是 badlogic/pi-mono 的 fork（shog-lab/pi-mono）。

## Git Remote

- `origin` → https://github.com/shog-lab/pi-mono.git（fork）
- `upstream` → https://github.com/badlogic/pi-mono.git（原项目）

## 提交

不要用 `git add -A` 或 `git add .`，始终 `git add 具体文件路径`。

## 同步上游

main 用 fast-forward，feature 分支用 rebase：

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main

git checkout feature/xxx
git rebase main
git push origin feature/xxx --force-with-lease
```

## 给上游提 PR

从 `upstream/main` 切干净分支，不从自己的 main 切：

```bash
git fetch upstream
git checkout -b fix/xxx upstream/main
# 做修改
git add 改动的文件
git commit -m "fix: 描述"
git push origin fix/xxx
gh pr create --repo badlogic/pi-mono --title "fix: 描述" --body "..."
```

如果不小心在 main 上改了上游文件，用 `git cherry-pick` 摘到 PR 分支：

```bash
git fetch upstream
git checkout -b fix/xxx upstream/main
git cherry-pick <commit-hash>
git push origin fix/xxx
```

## 启动 pi

```bash
npm run build && ./pi-test.sh
```
