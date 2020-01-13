const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk');

start()

async function start() {
  const viewportOptions = { width: 1280, height: 600 }
  const number = process.argv[2]

  try {
    const sequence = await readSequence()
    const browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: false })
    console.log(chalk.cyan.inverse('Browser has been started'))

    const page = await browser.newPage()
    await page.setViewport(viewportOptions)

    for (let loop = 0; loop < 5; loop++) {
      console.log(chalk.green(`${loop + 1}: `))
      for (let seq of sequence) {
        await page.goto(seq.url, { waitUntil: 'domcontentloaded' })

        try {
          await doSequence(seq, page, number)
          console.log(chalk.white.inverse(`${seq.url} send message`))  
        } catch (e) {
          console.log(chalk.red.inverse(`${seq.url} didn't send message`))
        }
      }
    }

    await browser.close()
    console.log(chalk.cyan.inverse('Success!'))
  } catch (e) {

  } finally {
    process.exit()
  }
}

function readSequence() {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, 'config', 'sequence.json'), (err, data) => {
      if (err) reject(err)
      resolve(JSON.parse(data))
    })
  })
}

async function iterateQueue(queue, page, number) {
  for (let item of queue) {
    try {
      await page.waitForSelector(item.selector, { timeout: 15000 })
      switch (item.action) {
        case "focus":
          await page.focus(item.selector)
          break
        case "type":
          if (item.delay)
            await page.type(item.selector, number, { delay: item.delay })
          else
            await page.type(item.selector, number)
          break
        case "click":
          await page.click(item.selector)
          break
        case "wait":
          await page.waitFor(item.delay)
          break
      }

    } catch (e) {
      return Promise.reject()
    }
  }
}

async function iterateQueueLoop(sequence, page, number) {
  for (let i = 0; i < sequence.attempt; i++) {
    try {
      await page.waitFor(sequence.delay)
      await iterateQueue(sequence.queue.loop, page, number)

    } catch (e) {
      return Promise.reject()
    }
  }
}

async function doSequence(sequence, page, number) {
  await iterateQueue(sequence.queue.main, page, number)
  await iterateQueueLoop(sequence, page, number)
}