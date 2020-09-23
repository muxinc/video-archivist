import Hapi from '@hapi/hapi';
import HapiPino from 'hapi-pino';
import 'hapi-typeorm';
import { Logger } from 'pino';

import { Connection, Repository } from 'typeorm';
import { ArchiveOffer } from './db/entities/ArchiveOffer.entity';
import { LinkOffer } from './db/entities/LinkOffer.entity';
import { Repo } from './db/entities/Repo.entity';
import { Video } from './db/entities/Video.entity';

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
  private readonly archiveOffers: Repository<ArchiveOffer>;
  private readonly linkOffers: Repository<LinkOffer>;

  constructor(
    private readonly logger: Logger,
    private readonly db: Connection,
  ) {
    this.repos = db.getRepository(Repo);
    this.videos = db.getRepository(Video);
    this.archiveOffers = db.getRepository(ArchiveOffer);
    this.linkOffers = db.getRepository(LinkOffer);
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

  getArchiveOffer(id: number): Promise<ArchiveOffer | undefined> {
    return this.archiveOffers.findOne({ id }, { relations: ['repo'] });
  }

  getLinkOffer(id: number): Promise<LinkOffer | undefined> {
    return this.linkOffers.findOne({ id }, { relations: ['repo', 'video']} );
  }

    
  // TODO: figure out why this plugin can't correctly depend on `hapi-pino`
  //       so that we can use `req` decorators the whole way through. As-is,
  //       if we decorate this with `{ apply: true }`, the req object is passed
  //       but it seems like `dependencies` is being ignored. The `expose` methods
  //       are stateless so we don't have request IDs for the moment, but that
  //       should be OK for this project (for now).
  public static readonly hapiPlugin: Hapi.Plugin<{}> = {
    name: 'data-service',
    dependencies: ['hapi-pino', 'hapi-typeorm'],
    register: async (server: Hapi.Server, options: {}) => {
      const getDataService = () => {
        return new DataService(
          server.logger,
          server.plugins['hapi-typeorm'].getConnection(),
        );
      };
  
      server.expose('getDataService', getDataService);
      server.decorate('request', 'getDataService', getDataService);
    },
  };
}
