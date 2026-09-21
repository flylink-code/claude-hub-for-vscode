<#
.SYNOPSIS
    Claude Hub for VS Code 一键打包脚本
.DESCRIPTION
    编译 TypeScript、运行测试并生成 .vsix 安装包。无论在哪个目录下运行均可自动定位项目根目录。
#>

[CmdletBinding()]
param(
    [switch]$SkipTest,
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 自动定位项目根目录 (即 scripts 的父目录)
$ProjectRoot = if ($PSScriptRoot) {
    Split-Path -Parent $PSScriptRoot
} else {
    $PWD.Path
}

# 确保在项目根目录下执行
$CallerDir = $PWD.Path
Push-Location $ProjectRoot

try {
    Write-Host "=== [1/4] 检查构建环境与根目录 ===" -ForegroundColor Cyan
    Write-Host "项目根目录: $ProjectRoot"

    if (-not (Test-Path "package.json")) {
        Write-Error "未在 $ProjectRoot 找到 package.json，请确认项目结构完整。"
        exit 1
    }

    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        Write-Error "未找到 npm，请先安装 Node.js 与 npm 环境。"
        exit 1
    }

    Write-Host "=== [2/4] 编译 TypeScript ===" -ForegroundColor Cyan
    npm run compile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "TypeScript 编译失败，终止打包。"
        exit $LASTEXITCODE
    }

    if (-not $SkipTest) {
        Write-Host "=== [3/4] 运行测试套件 ===" -ForegroundColor Cyan
        npm test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "单元测试未通过，终止打包。"
            exit $LASTEXITCODE
        }
    } else {
        Write-Host "=== [3/4] 跳过单元测试 ===" -ForegroundColor Yellow
    }

    Write-Host "=== [4/4] 打包 .vsix 插件包 ===" -ForegroundColor Cyan
    $targetDir = if ($OutputDir) {
        if ([System.IO.Path]::IsPathRooted($OutputDir)) {
            $OutputDir
        } else {
            Join-Path $CallerDir $OutputDir
        }
    } else {
        $ProjectRoot
    }

    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $vsceArgs = @("vsce", "package", "--no-dependencies")
    if ($targetDir -ne $ProjectRoot) {
        $vsceArgs += @("--out", $targetDir)
    }

    & npx $vsceArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "vsce 打包失败。"
        exit $LASTEXITCODE
    }

    $vsixFiles = Get-ChildItem -Path $targetDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending
    if ($vsixFiles.Count -gt 0) {
        $latest = $vsixFiles[0]
        $sizeKb = [math]::Round($latest.Length / 1KB, 2)
        Write-Host "`n打包成功!" -ForegroundColor Green
        Write-Host "文件位置: $($latest.FullName) ($sizeKb KB)" -ForegroundColor Green
        Write-Host "`n安装方式:" -ForegroundColor Cyan
        Write-Host "  1. 命令行安装: code --install-extension `"$($latest.FullName)`""
        Write-Host "  2. VS Code 界面安装: 扩展面板 -> 右上角 '...' 菜单 -> 从 VSIX 安装..."
    }
}
finally {
    Pop-Location
}
