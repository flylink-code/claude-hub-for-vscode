#!/usr/bin/env bash
set -e

# 定位项目根目录 (scripts 的父目录)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=== [1/4] 编译 TypeScript ==="
npm run compile

echo "=== [2/4] 运行测试套件 ==="
npm test

echo "=== [3/4] 打包 .vsix 插件包 ==="
npx vsce package --no-dependencies

echo "=== [4/4] 打包完成! ==="
ls -lh *.vsix
