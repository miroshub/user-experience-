import { api } from './ApiClient'

// H7 Ask wuzzufny (FR-19 to FR-21). Every call answers { turns, filters, results }.
export class AssistantApi {
  open() {
    return api.get('/api/ai/chat')
  }

  ask(text) {
    return api.post('/api/ai/chat', { text })
  }

  // The x on a chip: new filters without asking the model
  setFilters(filters) {
    return api.patch('/api/ai/filters', { filters })
  }
}

export const assistantApi = new AssistantApi()
