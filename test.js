const AppMgr = require('appmgr')
const delay = require('delay')
const debug = require('debug')('pagemon-test')
const pagemon = require('.')
const test = require('tape')

test(async (t) => {
  const msg = 'this page was slow'
  const m = new AppMgr({port: 0})
  let slowCalled = 0
  m.app.get('/slow', async (req, res) => {
    slowCalled++
    await delay(1000)
    res.send(msg)
  })
  await m.start()
  const url = m.siteurl + '/slow'

  const mon = new pagemon.Monitor()

  const run = async () => {
    const t0 = new Date()
    const g1 = await mon.got(url)
    t.equal(g1.body, msg)
    const t1 = new Date()
    const dur = t1 - t0
    return dur
  }

  const d1 = await run()
  t.assert(d1 > 800)
  t.assert(d1 < 1500)
  const d2 = await run()
  t.assert(d2 < 100)
  const d3 = await run()
  t.assert(d3 < 100)

  t.equal(slowCalled, 1)
  await mon.stop()
  await m.stop()
  t.end()
})

