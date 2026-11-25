import { useCallback, useEffect, useState } from 'react'

// Shared by every admin tab: load a list, run an action, show what happened, load again
export function useAdminData(loader) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(
    () =>
      loader()
        .then(setItems)
        .catch((err) => setError(err.message)),
    [loader],
  )

  useEffect(() => {
    reload()
  }, [reload])

  // done: the text shown after it worked, e.g. "Flag dismissed"
  async function run(change, done) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await change()
      setNotice(done)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return { items, error, notice, busy, run, reload }
}
