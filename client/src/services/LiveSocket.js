import { io } from 'socket.io-client'
import { api } from './ApiClient'

// The live connection (FR-22). It logs in with the same token as the API.
// Events are only "something changed in match X"; the pages then reload through the API.
export class LiveSocket {
  #socket = null
  #matchId = null

  #connect() {
    if (!this.#socket) {
      this.#socket = io({ auth: { token: api.getToken() } })
      // after a lost connection (server restart, Wi-Fi), get back into the open chat's room
      this.#socket.on('connect', () => {
        if (this.#matchId) this.#socket.emit('match:join', this.#matchId)
      })
    }
    return this.#socket
  }

  // Returns a function that stops listening
  on(event, handler) {
    const socket = this.#connect()
    socket.on(event, handler)
    return () => socket.off(event, handler)
  }

  // Only the two members of a match are let into its room; the server checks
  joinMatch(matchId) {
    this.#matchId = matchId
    this.#connect().emit('match:join', matchId)
  }

  leaveMatch(matchId) {
    if (this.#matchId === matchId) this.#matchId = null
    this.#socket?.emit('match:leave', matchId)
  }

  disconnect() {
    this.#socket?.disconnect()
    this.#socket = null
    this.#matchId = null
  }
}

export const liveSocket = new LiveSocket()
