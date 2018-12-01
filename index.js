const EventEmitter = require('events')
const delay = require('delay')
const got = require('got')
const debug = require('debug')('pagemon')

/*

  - switch to cancelable delay()

  - let the timing parameters be config options

*/


let counter = 0

class Monitor {
  constructor () {
    this.eventRelay = new EventEmitter()
    this.page = {}
    // this.lastResponse = {}
    // this.timeLastWanted = {}
    this.stopping = false
    this.running = []
  }

  stop () {
    return new Promise(resolve => {
      this.stopping = true
      debug('stopping')
      const check = () => {
        debug('are we stopped?  runners = %j', this.running)
        if (this.running.length === 0) {
          debug('stopped')
          resolve()
        }
      }
      check()
      this.eventRelay.on('runner-stopped', check)
    })
  }
  
  async got (url) {
    if (this.stopping) throw Error('already stopping')

    let page = this.page[url]
    if (page && page.lastResponse) {
      page.timeLastWanted = new Date()
      return page.lastResponse
    }
    
    debug('booting', url)
    await this.waitForResponse(url)
    debug('booting complete', url)
    return this.page[url].lastResponse
  }

  waitForResponse (url) {
    return new Promise(resolve => {
      if (!this.page[url]) this.page[url] = {
        waiting: []
      }
      this.page[url].waiting.push(resolve)

      const start = !this.page[url].timeLastWanted
      this.page[url].timeLastWanted = new Date()
      if (start) {
        debug('calling this.run(%j)', url)
        this.run(url)
      }
    })
  }

  async run (url) {
    let me = counter++
    this.running.push(me)
    let extra = 0
    debug('runner %d starting for %s', me, url)
    let lastFetchEnded = 0
    let delayms = 0
    while (true) {
      let now = new Date()
      const unfetched = now - lastFetchEnded
      // debug('runner %d unfetched %d delayms %d', me, unfetched, delayms)
      if (unfetched >= delayms) {
        debug('runner %d fetching, unfetched %d >= delayms %d', me, unfetched, delayms)
        console.log('actually fetching', url)
        this.page[url].lastResponse = await got(url)
        debug('runner %d got resolved', me)
        // call all the resolve() functions that are waiting
        this.page[url].waiting.map(x => x())
        now = new Date()
        lastFetchEnded = now
      }
      const unwanted = now - this.page[url].timeLastWanted
      delayms = 1000 + (unwanted / 10)
      debug('runner %d, delayms set to %dms', me, delayms)
      // only sleep a little while, so we can be awaked
      await delay(100)

      if (this.stopping || unwanted > 1000 * 1 * 5) {
        debug('runner %d stopping or expiring, url not wanted recently', me)
        delete this.page[url]
        this.running = this.running.filter(x => (x !== me))
        this.eventRelay.emit('runner-stopped')
        return
      }
    }
  }
}

const defaultMonitor = new Monitor()

function defaultGot (...args) {
  return defaultMonitor.got(...args)
}

module.exports = { got: defaultGot, defaultMonitor, Monitor }

