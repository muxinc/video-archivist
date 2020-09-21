import Hapi, { Plugin } from '@hapi/hapi';
import 'hapi-typeorm';

import { Connection, Repository } from 'typeorm';
import { Repo } from './db/entities/Repo.entity';
import { Video } from './db/entities/Video.entity';
import { GithubWebhookPayloads } from './types';

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
  private readonly repos: Repository<Repo>;
  private readonly videos: Repository<Video>;

  constructor(
    private readonly db: Connection,
  ) {
    this.repos = db.getRepository(Repo);
    this.videos = db.getRepository(Video);
  }

  getAllRepos(): Promise<ReadonlyArray<Repo>> {
    return this.repos.find();
  }

  async getRepo(organizationName: string, repositoryName: string): Promise<Repo | undefined> {
    return this.repos.findOne({ organizationName, repositoryName });
  }

  getAllVideos(): Promise<ReadonlyArray<Video>> {
    return this.videos.find();
  }

  async getVideo(videoId: string): Promise<Video | undefined> {
    return this.videos.findOne({ id: videoId });
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
