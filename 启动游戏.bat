@echo off
chcp 65001 >nul
title 一杆入袋 · PRO POOL
cd /d "%~dp0"
if exist "index.html" (
  start "" "index.html"
) else (
  echo 未找到 index.html，请确认游戏文件完整。
  pause
)
