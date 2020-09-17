import * as Hapi from '@hapi/hapi';
import { AppOptions } from './server';

export async function attachRoutes(server: Hapi.Server, opts: AppOptions) {
  server.route({
    method: 'POST',
    path: '/webhooks/github',
    options: {
      auth: {
        strategies: ['githubwebhook'],
        payload: 'required',
      },
    },
    handler: async function() {
      return '';
    }
  })
}
