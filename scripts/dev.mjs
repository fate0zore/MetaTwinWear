import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import net from 'node:net'
import process from 'node:process'

const mode = process.argv[2]
const isWindows = process.platform === 'win32'
const children = []
let stopping = false

if (!['mock', 'integration'].includes(mode)) {
  console.error('用法: npm run dev:mock | npm run dev:integration')
  process.exit(2)
}

function run(command, args, options = {}) {
  const child = isWindows
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], options)
    : spawn(command, args, options)
  return child
}

function start(command, args, options = {}) {
  const child = run(command, args, { stdio: 'inherit', detached: !isWindows, ...options })
  children.push(child)
  child.once('error', (error) => {
    console.error(`启动进程失败: ${error.message}`)
    void stopAll(1)
  })
  child.once('exit', (code, signal) => {
    if (!stopping) {
      console.error(`进程已退出 (code=${code ?? 'null'}, signal=${signal ?? 'none'})`)
      void stopAll(code && code !== 0 ? code : 1)
    }
  })
  return child
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function portIsBusy(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function ensurePortsFree(ports) {
  const busy = []
  for (const [port, name] of ports) {
    if (await portIsBusy(port)) busy.push(`${name} (${port})`)
  }
  if (busy.length) throw new Error(`以下端口已被占用，请先停止占用它们的程序：${busy.join('、')}`)
}

function assertChildrenRunning() {
  const exited = children.find((child) => child.exitCode !== null || child.signalCode !== null)
  if (exited) throw new Error('启动进程提前退出，请查看上方服务日志。')
}

async function waitFor(url, label, timeoutMs, accept = (response) => response.ok) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    assertChildrenRunning()
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (accept(response)) {
        console.log(`✓ ${label} 已就绪`)
        return
      }
    } catch {
      // Service is still starting; keep polling until it is ready or times out.
    }
    await delay(1000)
  }
  throw new Error(`等待 ${label} 超时：${url}`)
}

async function ensureFrontendDependencies() {
  try {
    await access('frontend/node_modules/vite/bin/vite.js')
  } catch {
    console.log('未检测到前端依赖，正在执行 npm --prefix frontend ci…')
    const installer = run('npm', ['--prefix', 'frontend', 'ci'], { stdio: 'inherit' })
    const code = await new Promise((resolve, reject) => {
      installer.once('error', reject)
      installer.once('exit', (exitCode) => resolve(exitCode ?? 1))
    })
    if (code !== 0) throw new Error(`前端依赖安装失败 (exit code ${code})`)
  }
}

function startGradle(task) {
  if (isWindows) {
    return start('gradlew.bat', [task, '--args=--debug=false'], { cwd: 'backend' })
  }
  return start('bash', ['gradlew', task, '--args=--debug=false'], { cwd: 'backend' })
}

function startFrontend() {
  console.log(`前端启动地址: http://localhost:5173/monitor (${mode === 'mock' ? 'Mock' : 'API'})`)
  return start('npm', ['--prefix', 'frontend', 'run', 'dev', '--', '--strictPort'], {
    env: { ...process.env, VITE_DATA_SOURCE: mode === 'mock' ? 'mock' : 'api' },
  })
}

async function stopAll(exitCode = 0) {
  if (stopping) return
  stopping = true
  const running = children.filter((child) => child.pid && child.exitCode === null && child.signalCode === null)
  if (isWindows) {
    await Promise.all(running.map((child) => new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      killer.once('error', resolve)
      killer.once('exit', resolve)
    })))
  } else {
    for (const child of running.reverse()) child.kill('SIGTERM')
    await Promise.race([Promise.all(running.map((child) => new Promise((resolve) => child.once('exit', resolve)))), delay(3000)])
    for (const child of running) {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }
  }
  process.exitCode = exitCode
}

process.once('SIGINT', () => void stopAll(130))
process.once('SIGTERM', () => void stopAll(143))

try {
  await ensureFrontendDependencies()
  if (mode === 'mock') {
    await ensurePortsFree([[5173, 'Vite']])
    startFrontend()
  } else {
    await ensurePortsFree([[8761, 'Eureka'], [8081, '监控服务'], [8080, 'Gateway'], [5173, 'Vite']])

    console.log('正在启动 Eureka 注册中心…')
    startGradle(':discovery-server:bootRun')
    await waitFor('http://localhost:8761/actuator/health', 'Eureka', 180000)

    console.log('正在启动监控业务服务…')
    startGradle(':monitoring-service:bootRun')
    await waitFor('http://localhost:8081/actuator/health', '监控业务服务', 240000)
    await waitFor('http://localhost:8761/eureka/apps/MONITORING-SERVICE', 'Eureka 服务注册', 90000)

    console.log('正在启动 API Gateway…')
    startGradle(':api-gateway:bootRun')
    await waitFor('http://localhost:8080/actuator/health', 'API Gateway', 180000)

    await waitFor('http://localhost:8080/api/v1/monitoring/snapshot', '监控 API', 30000)
    startFrontend()
  }
  console.log('按 Ctrl+C 停止本次启动的所有服务。')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  await stopAll(1)
}
