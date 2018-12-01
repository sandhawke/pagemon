const EventEmitter = require('events')
const delay = require('delay')
const got = require('got')
const debug = require('debug')('pagemon')

/*

  clean up by:

  - switch to cancelable delay()
  - switch to this.page[url] = { timeLastWanted, lastResponse, ... }

*/


let counter = 0

class Monitor {
  constructor () {
    this.eventRelay = new EventEmitter()
    this.lastResponse = {}
    this.timeLastWanted = {}
  }

  async got (url) {
    let response = this.lastResponse[url]
    if (!response) {
      debug('booting', url)
      await this.booting(url)
      response = this.lastResponse[url]
      debug('booting complete', url)
    } else {
      this.timeLastWanted[url] = new Date()
    }
    return response
  }

  booting (url) {
    debug('booting, with %O', this.timeLastWanted)
    const start = !this.timeLastWanted[url]
    this.timeLastWanted[url] = new Date()
    if (start) {
      debug('calling this.run(%j)', url)
      this.run(url)
    }
    return new Promise(resolve => {
      const listener = (eventURL) => {
        if (url === eventURL) {
          this.eventRelay.removeListener('got', listener)
          resolve()
        }
      }
      this.eventRelay.on('got', listener)
    })
  }

  async run (url) {
    let me = counter++
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
        this.lastResponse[url] = await got(url)
        debug('runner %d got resolved', me)
        this.eventRelay.emit('got', url)
        now = new Date()
        lastFetchEnded = now
      }
      const unwanted = now - this.timeLastWanted[url]
      delayms = 1000 + (unwanted / 10)
      debug('runner %d, delayms set to %dms', me, delayms)
      // only sleep a little while, so we can be awaked
      await delay(100)

      if (unwanted > 1000 * 1 * 5) {
        debug('runner %d expiring, url not wanted recently', me)
        delete this.timeLastWanted[url]
        delete this.lastResponse[url]
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

