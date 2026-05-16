const fs = require('fs')
const path = require('path')
const { createLogger, format, transports } = require('winston')
const { combine, timestamp, printf, colorize } = format

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] : ${message}`
})

const logDir = 'logs'
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir)

const logFiles = ['api.log', 'error.log']

function cleanupLogs() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 14)

  logFiles.forEach((file) => {
    const filePath = path.join(logDir, file)
    if (!fs.existsSync(filePath)) return

    const lines = fs.readFileSync(filePath, 'utf8').split('\n')
    const recent = lines.filter((line) => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2})/)
      if (!match) return true
      const logDate = new Date(match[1])
      return logDate >= cutoffDate
    })
    fs.writeFileSync(filePath, recent.join('\n'), 'utf8')
    console.log(`[Log Cleanup] Old entries removed from ${file}`)
  });
}

setInterval(cleanupLogs, 24 * 60 * 60 * 1000);

cleanupLogs()


const apiLog = createLogger({
  level: 'info',
  format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new transports.Console(),
     new transports.File({ filename: 'logs/api.log' })],
})

const errorLog = createLogger({
  level: 'error',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new transports.Console(),
     new transports.File({ filename: 'logs/error.log' })],
})

module.exports = { apiLog, errorLog }