const EventEmitter = require('eventemitter3')

class Monitor {
  constructor () {
    this.pageByURL = {}
  }

  pageForURL (url) {
    let page = this.pageByURL[url]
    if (!page) {
      page = new Page(url)
      this.pageByURL[url] = page
    }
    return page
  }
  
  fetch (url) {
    return new Promise((resolve, reject) => {
      const page = this.pageForURL(url)
      if (page.ready) {
        resolve(page)
      } else {
        page.on('ready', () => {resolve(page)})
      }
    })
  }
}

// SmartResponse  
class Page extends EventEmitter {
  // ready
  // emit('ready')
  // construct -- should start the fetching
  // but the reloading?
}

const defaultMonitor = new Monitor()

function fetch (...args) {
  return defaultMonitor.fetch(...args)
}

module.exports = { fetch, defaultMonitor, Monitor }


//  response = await pagemon.fetch(url)
//  body = await response.text() or .json or whatever
//
//  https://www.npmjs.com/package/got
//
//  multigot
//     2 call got and they get the same reply?
//
//  memoize got?
//
