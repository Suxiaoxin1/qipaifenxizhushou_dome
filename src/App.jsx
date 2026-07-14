import { useState, useEffect, useRef } from 'react'
import './index.css'

const MODELS = ['kimi-k2.5', 'kimi-k2.6']

const DEFAULT_CONFIG = {
  kimiModel: 'kimi-k2.5',
  selectedWindowTitle: '',
  kimiApiKeyMasked: ''
}

const GAME_TYPES = {
  texas_holdem: '德州扑克',
  omaha: '奥马哈',
  short_deck: '短牌',
  aof: 'All-in or Fold',
  tournament: '锦标赛',
  sng: '坐满即玩',
  pineapple: '菠萝扑克'
}

const ACTIONS = {
  fold: '弃牌',
  check: '过牌',
  call: '跟注',
  raise: '加注',
  all_in: '全押'
}

const LABELS = {
  position: '位置',
  holeCards: '我的手牌',
  communityCards: '公共牌',
  betToCall: '跟注',
  potSize: '底池'
}

function formatDetected(detected, confidence) {
  const lines = []
  if (Object.values(confidence || {}).some(v => String(v) === '低')) {
    lines.push('[注意] 以下信息识别不确定，请核对截图后再行动')
  }
  lines.push('识别到的信息：')
  for (const key of Object.keys(LABELS)) {
    const label = LABELS[key]
    const value = detected?.[key]
    const conf = confidence?.[key] !== undefined ? String(confidence[key]) : '未知'
    const display = value == null || value === '' ? '未知' : (Array.isArray(value) ? value.map(v => String(v)).join(' / ') : String(value))
    lines.push(`${label}：${display}（${conf}）`)
  }
  return lines.join('\n')
}

function formatResult(result) {
  if (!result || typeof result !== 'object') return '暂无分析结果'
  if (result.result === '非牌桌') return '当前画面不是牌桌，未进行分析。'

  const lines = []
  if (result.detected && result.confidence) {
    lines.push(formatDetected(result.detected, result.confidence))
  }
  const gameType = GAME_TYPES[String(result.gameType)] || String(result.gameType || '未知类型')
  const action = ACTIONS[String(result.recommendedAction)] || String(result.recommendedAction || '未知')
  lines.push(`牌局类型：${gameType}`)
  lines.push(`建议行动：${action}`)
  if (result.detail) {
    lines.push(`\n${result.detail}`)
  }
  return lines.filter(Boolean).join('\n')
}

function getMaskedKey(key) {
  if (!key || key.length < 8) return ''
  return key.slice(0, 3) + '****' + key.slice(-4)
}

function mockAnalyze() {
  return {
    analyzedAt: new Date().toISOString(),
    parsed: {
      result: 'ok',
      gameType: 'texas_holdem',
      recommendedAction: 'raise',
      detail: '你的手牌较强，公共牌形成顺子听牌，建议加注施压。',
      detected: {
        position: '按钮位',
        holeCards: ['A♠', 'K♥'],
        communityCards: ['Q♦', 'J♣', '9♠'],
        betToCall: '10 BB',
        potSize: '35 BB'
      },
      confidence: {
        position: '高',
        holeCards: '高',
        communityCards: '高',
        betToCall: '中',
        potSize: '中'
      }
    }
  }
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(DEFAULT_CONFIG.kimiModel)
  const [maskedKey, setMaskedKey] = useState(DEFAULT_CONFIG.kimiApiKeyMasked)
  const [message, setMessage] = useState('已启动，请确保 WePoker 页面已在浏览器中打开，后台将自动截图分析。')
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState('')
  const [kimiCount, setKimiCount] = useState(0)
  const [running, setRunning] = useState(true)
  const [selectedWindow, setSelectedWindow] = useState(DEFAULT_CONFIG.selectedWindowTitle)
  const [windows, setWindows] = useState([])
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const timerRef = useRef(null)
  const lastAnalyzedAtRef = useRef('')
  const countRef = useRef(0)

  useEffect(() => {
    const savedKey = localStorage.getItem('poker_ai_apiKey') || ''
    const savedModel = localStorage.getItem('poker_ai_model') || DEFAULT_CONFIG.kimiModel
    const savedWindow = localStorage.getItem('poker_ai_window') || DEFAULT_CONFIG.selectedWindowTitle
    setMaskedKey(getMaskedKey(savedKey))
    setModel(savedModel)
    setSelectedWindow(savedWindow)
    setMessage('配置已加载。这是一个演示版本，截图和分析为模拟数据。')

    startPolling()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function startPolling() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(tick, 500)
  }

  function tick() {
    if (!running) {
      timerRef.current = setTimeout(tick, 500)
      return
    }

    // 模拟状态更新
    if (Math.random() > 0.7) {
      const shouldAnalyze = Math.random() > 0.5
      if (shouldAnalyze && countRef.current < 99) {
        countRef.current += 1
        setKimiCount(countRef.current)
        setAnalyzing(true)
        setTimeout(() => {
          const data = mockAnalyze()
          setAnalyzing(false)
          lastAnalyzedAtRef.current = data.analyzedAt
          setResult(formatResult(data.parsed))
          setPreview('/sample-table.jpg')
          setMessage(`已发送 KIMI 分析 ${countRef.current} 次`)
        }, 800)
      }
    }

    timerRef.current = setTimeout(tick, 1500)
  }

  async function handleRefreshWindows() {
    setWindows(['WePoker-H5 - 浏览器窗口 1', '照片'])
    setMessage('已找到 2 个窗口，请从下拉框中选择。')
  }

  async function handleSaveConfig() {
    localStorage.setItem('poker_ai_apiKey', apiKey)
    localStorage.setItem('poker_ai_model', model)
    localStorage.setItem('poker_ai_window', selectedWindow)
    setMaskedKey(getMaskedKey(apiKey))
    setApiKey('')
    setMessage('配置已保存。')
  }

  async function handleToggle() {
    const next = !running
    setRunning(next)
    setMessage(next ? '分析已恢复。' : '分析已暂停。')
  }

  async function handleSkip() {
    countRef.current += 1
    setKimiCount(countRef.current)
    setAnalyzing(true)
    setTimeout(() => {
      const data = mockAnalyze()
      setAnalyzing(false)
      lastAnalyzedAtRef.current = data.analyzedAt
      setResult(formatResult(data.parsed))
      setPreview('/sample-table.jpg')
      setMessage('已发送最新截图给 KIMI。')
    }, 600)
  }

  async function handleQuit() {
    setMessage('程序已退出，请关闭此页面。')
  }

  async function handleSelectWindow(title) {
    setSelectedWindow(title)
    localStorage.setItem('poker_ai_window', title)
    setMessage(title ? `已锁定窗口: ${title}` : '已恢复自动查找 WePoker。')
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>牌局 AI 分析助手</h1>
        <p className="config-status">
          KIMI Key：{maskedKey || '未配置'}　|　已发送 KIMI：{kimiCount} 次
        </p>
        <label>
          KIMI API Key
          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
            placeholder="sk-..."
          />
        </label>
        <button onClick={handleSaveConfig}>保存配置</button>
        <label>
          模型
          <select value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <div className="actions">
          <button onClick={() => window.open('https://h5.wpk.com/', '_blank')}>打开打牌网站</button>
        </div>
        <div className="window-select">
          <p>当前窗口：{selectedWindow || '自动查找 WePoker'}</p>
          <div className="actions">
            <button onClick={handleRefreshWindows}>刷新窗口列表</button>
            <button onClick={() => handleSelectWindow('')} disabled={!selectedWindow}>恢复自动</button>
          </div>
          <select value={selectedWindow} onChange={e => handleSelectWindow(e.target.value)}>
            <option value="">自动查找 WePoker</option>
            {windows.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="actions">
          <button onClick={handleToggle} className={running ? 'btn-running' : 'btn-paused'}>
            {running ? '暂停分析' : '继续分析'}
          </button>
          <button onClick={handleQuit} style={{ background: '#666', borderColor: '#666' }}>退出程序</button>
        </div>
        <p className="message-text">{message}</p>
      </section>

      <section className="panel preview-panel">
        <h2>画面预览</h2>
        {preview ? (
          <img src={preview} alt="实时截图" />
        ) : (
          <div className="empty-preview">等待截图</div>
        )}
        {error && <p style={{ color: '#c62828', margin: '8px 0 0', fontSize: 13, wordBreak: 'break-word' }}>{error}</p>}
        <button onClick={handleSkip} style={{ marginTop: 8 }}>发送这张图给 KIMI</button>
      </section>

      <section className="panel result-panel">
        <h2>分析结果</h2>
        {analyzing && <p style={{ color: '#666', margin: '8px 0' }}>分析中...</p>}
        <pre>{result || (analyzing ? '' : '暂无分析结果')}</pre>
      </section>
    </main>
  )
}

export default App
