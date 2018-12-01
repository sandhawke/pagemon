/*

  Test with:

SLOW='http://localhost:8080/slow'
time curl $SLOW
  # should be 3s

  # (change the thing at the end to use different cache slot)
FAST='http://localhost:8080/?url=http%3A%2F%2Flocalhost%3A8080%2Fslow?121'
time curl $FAST
  # should be 3s

time curl $FAST
  # after the first time, it should be very fast

siege -b -c 100 -t 30s $FAST
  # very very fast  (2500 trans/sec for me, longest transaction 0.35s)
*/


const m = require('appmgr').create()
const delay = require('delay')
const debug = require('debug')('pagemon-test')
const { got } = require('.')

m.app.get('/', async (req, res) => {
  if (req.query.url) {
    res.send(await proxy(req.query.url))
  } else {
    res.send(m.H`<html><head></head><body>

<form method="get">
Document to poll: <input size="80" type="text" name="url"></input>
</form>
</body></html>
`)
  }
})

m.app.get('/slow', async (req, res) => {
  console.log('**** /slow requested ****')
  await delay(3000)
  res.send('This page took 3 seconds')
})

async function proxy (url) {
  debug('doing get of %j', url)
  const response = await got(url)
  const body = response.body
  debug('got response, body = %d chars', body.length)
  return body
}
