import Hapi, { Plugin } from '@hapi/hapi';
import 'hapi-typeorm';

import { Connection } from 'typeorm';

declare module '@hapi/hapi' {
  interface Request {
    getDataService: () => DataService;
  }

  interface PluginProperties {
    'data-service': {
      getDataService: () => DataService;
    }
  }
}

export class DataService {
  constructor(
    private readonly db: Connection,
  ) {
    
  }
    
  public static readonly hapiPlugin: Plugin<{}> = {
    name: 'data-service',
    register: async (server: Hapi.Server, options: {}) => {
      const getDataService: () => DataService = () => {
        return new DataService(server.plugins['hapi-typeorm'].getConnection());
      };
  
      server.expose('getDataService', getDataService);
      server.decorate('request', 'getDataService', getDataService);
    },
  };
}
