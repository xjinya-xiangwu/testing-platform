#!/usr/bin/env node

import { watch, readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { join, relative, resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// 需要监听的文件扩展名
const watchExtensions = ['.ts', '.tsx', '.js', '.jsx', '.less', '.json', '.md', '.html'];

// 需要忽略的目录和文件
const ignorePatterns = ['node_modules', '.git', 'dist', 'build', '.vscode', 'coverage', '.next', '.cache', 'pnpm-lock.yaml'];

// 防抖计时器
let debounceTimer = null;
const DEBOUNCE_DELAY = 2000; // 2秒防抖，给自动保存检测足够的时间

// 正在运行的进程
let runningProcess = null;

// 是否正在执行命令（执行期间忽略文件变化）
let isRunningCommands = false;

// 命令执行的时间范围（用于判断文件是否是工具修改的）
let commandStartTime = null;
let commandEndTime = null;

// 工具修改的文件及其修改时间（在执行命令期间被修改的文件）
const toolModifiedFiles = new Map(); // filePath -> mtimeMs

// 文件修改历史记录（用于检测非手动保存）
const fileModifyHistory = new Map(); // filePath -> { count: number, firstTime: number, lastTime: number }
const MANUAL_SAVE_DETECTION_WINDOW = 2000; // 2秒内的多次修改认为不是手动保存
const MANUAL_SAVE_THRESHOLD = 2; // 2秒内超过2次修改认为不是手动保存（手动保存通常1-2次，自动保存会更多）

// 当前待处理的修改文件列表
let pendingModifiedFiles = new Set();

/**
 * 检查路径是否应该被忽略
 */
function shouldIgnore(path) {
    const relativePath = relative(projectRoot, path);
    return ignorePatterns.some((pattern) => relativePath.includes(pattern));
}

/**
 * 检查文件是否应该被监听
 */
function shouldWatchFile(filePath) {
    if (shouldIgnore(filePath)) {
        return false;
    }

    const ext = extname(filePath);

    // 特殊处理 .module.less
    if (filePath.endsWith('.module.less')) {
        return true;
    }

    return watchExtensions.includes(ext);
}

/**
 * 构建命令，只处理修改的文件
 */
function buildCommandForFiles(commandName, files) {
    if (files.size === 0) {
        return null;
    }

    // 将文件路径转换为相对路径，并转义特殊字符
    const fileList = Array.from(files)
        .map((f) => {
            const relPath = relative(projectRoot, f);
            // 转义空格和特殊字符
            return `"${relPath.replace(/"/g, '\\"')}"`;
        })
        .join(' ');

    switch (commandName) {
        case 'prettier':
            // prettier 可以接受文件列表
            return `prettier --write ${fileList}`;
        case 'lint-fix':
            // eslint 可以接受文件列表
            return `eslint --fix ${fileList}`;
        case 'ls-lint':
            // ls-lint 检查整个项目，但我们可以传递文件列表（如果支持的话）
            // 如果不支持，就检查整个项目
            return 'ls-lint';
        default:
            return null;
    }
}

/**
 * 执行命令序列
 */
function runCommands(commandIndex = 0, files) {
    const commands = [{ name: 'prettier' }, { name: 'lint-fix' }, { name: 'ls-lint' }];

    if (commandIndex >= commands.length) {
        runningProcess = null;
        console.log('✅ 所有检查完成\n');
        // 记录命令结束时间
        commandEndTime = Date.now();
        // 延迟重置状态，给工具修改文件的时间
        setTimeout(() => {
            isRunningCommands = false;
            // 延迟清理工具修改的文件记录，确保工具修改的文件在时间窗口内被识别
            setTimeout(() => {
                toolModifiedFiles.clear();
                commandStartTime = null;
                commandEndTime = null;
            }, 2000); // 2秒后清理
        }, 500); // 0.5秒后重置执行状态
        return;
    }

    const command = commands[commandIndex];
    const cmd = buildCommandForFiles(command.name, files);

    if (!cmd) {
        // 如果没有文件需要处理，跳过
        console.log(`⏭️  [${commandIndex + 1}/${commands.length}] ${command.name} 跳过（无文件需要处理）`);
        runCommands(commandIndex + 1, files);
        return;
    }

    console.log(`\n🔍 [${commandIndex + 1}/${commands.length}] 正在运行 ${command.name}...`);
    if (files.size > 0 && command.name !== 'ls-lint') {
        console.log(`   处理文件: ${files.size} 个`);
    }

    runningProcess = exec(cmd, { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ ${command.name} 执行失败:`);
            if (stderr) console.error(stderr);
            if (stdout) console.error(stdout);
            // 即使失败也继续执行下一个命令
            runCommands(commandIndex + 1, files);
        } else {
            console.log(`✅ ${command.name} 执行完成`);
            if (stdout && stdout.trim() && !stdout.includes('unchanged')) {
                console.log(stdout);
            }
            // 执行下一个命令
            runCommands(commandIndex + 1, files);
        }
    });
}

/**
 * 执行所有检查命令
 */
function runAllChecks(modifiedFiles) {
    // 如果正在执行命令，忽略新的触发
    if (isRunningCommands) {
        return;
    }

    // 如果已有进程在运行，先终止
    if (runningProcess) {
        runningProcess.kill();
        runningProcess = null;
    }

    // 过滤出需要处理的文件（排除工具修改的文件）
    const filesToProcess = new Set();
    for (const filePath of modifiedFiles) {
        if (!toolModifiedFiles.has(filePath)) {
            filesToProcess.add(filePath);
        }
    }

    if (filesToProcess.size === 0) {
        console.log('\n⏭️  没有需要处理的文件\n');
        return;
    }

    isRunningCommands = true;
    commandStartTime = Date.now();
    commandEndTime = null;
    toolModifiedFiles.clear(); // 清空之前的记录
    console.log(`\n📝 检测到文件变化，开始执行代码检查和格式化...`);
    console.log(`   修改的文件: ${filesToProcess.size} 个`);
    runCommands(0, filesToProcess);
}

/**
 * 检测是否是手动保存（Ctrl+S / Cmd+S）
 * 手动保存的特征：1-2次修改，间隔较长或单次
 * 自动保存的特征：短时间内频繁修改（每1秒一次）
 */
function isManualSave(filePath, currentTime) {
    const history = fileModifyHistory.get(filePath);

    if (!history) {
        // 第一次修改，记录历史，可能是手动保存
        fileModifyHistory.set(filePath, {
            count: 1,
            firstTime: currentTime,
            lastTime: currentTime,
        });
        return true; // 暂时认为是手动保存，等待防抖期间确认
    }

    // 检查时间窗口
    const timeSinceFirst = currentTime - history.firstTime;
    const timeSinceLast = currentTime - history.lastTime;

    if (timeSinceFirst > MANUAL_SAVE_DETECTION_WINDOW) {
        // 超过时间窗口，重置历史，可能是新的手动保存
        fileModifyHistory.set(filePath, {
            count: 1,
            firstTime: currentTime,
            lastTime: currentTime,
        });
        return true;
    }

    // 在时间窗口内，增加计数
    history.count++;
    history.lastTime = currentTime;

    // 如果修改次数超过阈值，认为不是手动保存（可能是自动保存）
    if (history.count > MANUAL_SAVE_THRESHOLD) {
        return false;
    }

    // 如果修改间隔很短（小于1.5秒），可能是自动保存
    if (timeSinceLast < 1500 && history.count > 1) {
        // 间隔很短且多次修改，可能是自动保存
        return false;
    }

    // 在时间窗口内，但修改次数未超过阈值，且间隔合理，可能是手动保存
    return true;
}

/**
 * 处理文件变化事件
 */
function handleFileChange(filePath) {
    if (!shouldWatchFile(filePath)) {
        return;
    }

    // 获取文件的修改时间
    let fileMtimeMs = null;
    try {
        const stats = statSync(filePath);
        fileMtimeMs = stats.mtimeMs;
    } catch (error) {
        // 文件可能不存在，忽略
        return;
    }

    const currentTime = Date.now();

    // 如果正在执行命令，记录这个文件被工具修改了，并忽略
    if (isRunningCommands) {
        toolModifiedFiles.set(filePath, fileMtimeMs);
        // 清除手动保存检测历史
        fileModifyHistory.delete(filePath);
        return;
    }

    // 检查这个文件是否是工具修改的
    // 1. 如果文件在工具修改列表中
    // 2. 且文件的修改时间在命令执行时间范围内（允许前后1秒的误差）
    if (commandStartTime && commandEndTime) {
        const toolMtime = toolModifiedFiles.get(filePath);
        if (toolMtime) {
            // 文件在工具修改列表中
            // 检查文件的修改时间是否在命令执行时间范围内
            const timeWindowStart = commandStartTime - 1000; // 允许1秒误差
            const timeWindowEnd = commandEndTime + 3000; // 命令结束后3秒内都认为是工具修改的

            if (fileMtimeMs >= timeWindowStart && fileMtimeMs <= timeWindowEnd) {
                // 这个文件是工具修改的，忽略
                // 清除手动保存检测历史
                fileModifyHistory.delete(filePath);
                return;
            }
        }

        // 即使不在工具修改列表中，如果文件的修改时间在命令执行时间范围内，也可能是工具修改的
        if (fileMtimeMs >= commandStartTime - 1000 && fileMtimeMs <= commandEndTime + 1000) {
            // 文件修改时间接近命令执行时间，可能是工具修改的，忽略
            // 清除手动保存检测历史
            fileModifyHistory.delete(filePath);
            return;
        }
    }

    // 检测是否是手动保存（Ctrl+S / Cmd+S）
    const isManual = isManualSave(filePath, currentTime);
    if (!isManual) {
        // 不是手动保存（可能是自动保存或工具修改），忽略
        const history = fileModifyHistory.get(filePath);
        if (history && history.count > MANUAL_SAVE_THRESHOLD) {
            // 调试信息：检测到自动保存
            console.log(`⏭️  检测到自动保存，已忽略: ${relative(projectRoot, filePath)} (${history.count}次修改)`);
        }
        return;
    }

    // 防抖处理
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // 将文件添加到待处理列表
    pendingModifiedFiles.add(filePath);

    debounceTimer = setTimeout(() => {
        // 收集所有待处理的文件
        const filesToProcess = new Set();
        const filesToRemove = [];

        for (const file of pendingModifiedFiles) {
            const finalHistory = fileModifyHistory.get(file);
            if (finalHistory && finalHistory.count > MANUAL_SAVE_THRESHOLD) {
                // 在防抖期间，文件被多次修改，不是手动保存，跳过
                console.log(`⏭️  防抖期间检测到多次修改，已跳过: ${relative(projectRoot, file)} (${finalHistory.count}次修改)`);
                filesToRemove.push(file);
            } else {
                // 确认是手动保存，添加到处理列表
                filesToProcess.add(file);
                filesToRemove.push(file);
            }
        }

        // 清理已处理的文件历史
        for (const file of filesToRemove) {
            fileModifyHistory.delete(file);
            pendingModifiedFiles.delete(file);
        }

        if (filesToProcess.size > 0) {
            console.log(`✅ 检测到手动保存: ${filesToProcess.size} 个文件`);
            runAllChecks(filesToProcess);
        }
    }, DEBOUNCE_DELAY);
}

/**
 * 递归监听目录（支持 Windows、macOS 和 Linux）
 */
function watchDirectory(dirPath) {
    if (shouldIgnore(dirPath)) {
        return;
    }

    try {
        // 使用 recursive 选项（Node.js 18+ 支持 Windows、macOS 和 Linux）
        // 只监听 'change' 事件（文件内容变化），忽略 'rename' 事件（文件重命名/删除）
        const watcher = watch(dirPath, { recursive: true }, (eventType, filename) => {
            // 只处理文件内容变化事件，不处理重命名或删除
            if (eventType === 'change' && filename) {
                const fullPath = join(dirPath, filename);
                try {
                    // 检查文件是否存在且是文件（不是目录）
                    const stats = statSync(fullPath);
                    if (stats.isFile()) {
                        handleFileChange(fullPath);
                    }
                } catch (error) {
                    // 文件可能不存在，忽略
                }
            }
        });

        watcher.on('error', (error) => {
            // 忽略常见的错误（Windows 上目录删除可能报告 EPERM）
            if (error.code !== 'ENOENT' && error.code !== 'EPERM' && error.code !== 'EACCES') {
                // 静默处理错误，避免过多输出
            }
        });
    } catch (error) {
        // 如果 recursive 不支持（Node.js < 18 或某些特殊情况）
        if (error.code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
            console.warn('⚠️  当前平台或 Node.js 版本不支持递归监听');
            console.warn('   请升级到 Node.js 18+ 以获得完整支持');
            // 可以在这里实现非递归的监听逻辑作为回退方案
        } else {
            console.error('❌ 启动文件监听失败:', error.message);
        }
    }
}

function main() {
    console.log('🚀 启动文件监听，自动运行代码检查和格式化...\n');
    console.log('⏹️  按 Ctrl+C 停止监听\n');

    try {
        watchDirectory(projectRoot);
        console.log('✅ 文件监听已启动\n');
    } catch (error) {
        console.error('❌ 启动文件监听失败:', error.message);
        process.exit(1);
    }

    process.on('SIGINT', () => {
        console.log('\n\n👋 停止文件监听');
        if (runningProcess) {
            runningProcess.kill();
        }
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        if (runningProcess) {
            runningProcess.kill();
        }
        process.exit(0);
    });
}

main();
