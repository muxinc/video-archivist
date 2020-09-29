import Hapi from '@hapi/hapi';
import HapiPino from 'hapi-pino';
import 'hapi-typeorm';
import { Logger } from 'pino';

import { Connection, Repository } from 'typeorm';
import { ArchiveOffer } from './db/entities/ArchiveOffer.entity';
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

  constructor(
    private readonly logger: Logger,
    private readonly db: Connection,
  ) {
    this.repos = db.getRepository(Repo);
    this.videos = db.getRepository(Video);
    this.archiveOffers = db.getRepository(ArchiveOffer);
  }

  getAllRepos(): Promise<ReadonlyArray<Repo>> {
    return this.repos.find();
  }

  async getRepo(organizationName: string, repositoryName: string): Promise<Repo | undefined> {
    return this.repos.findOne({ organizationName, repositoryName }, { relations: ['videos'] });
  }

  getAllVideos(): Promise<ReadonlyArray<Video>> {
    return this.videos.find();
  }

  async getVideo(videoId: string): Promise<Video | undefined> {
    return this.videos.findOne({ id: videoId });
  }

  async createVideo(fields: Partial<Video>): Promise<Video> {
    return this.videos.save(fields);
  }

  async linkVideoWithRepo(repo: Repo, video: Video): Promise<Repo> {
    const repoWithRelation = repo.videos ? repo : (await this.getRepo(repo.organizationName, repo.repositoryName))!;
    
    repoWithRelation.videos!.push(video);
    this.repos.save(repoWithRelation);

    return repoWithRelation;
  }

  async getVideoByOriginalURL(originalUrl: string): Promise<Video | undefined> {
    return this.videos.findOne({ originalUrl });
  }

  getArchiveOffer(id: number): Promise<ArchiveOffer | undefined> {
    return this.archiveOffers.findOne({ id }, { relations: ['repo'] });
  }

  async createArchiveOffer(fields: Partial<ArchiveOffer>): Promise<ArchiveOffer> {
    return this.archiveOffers.save(fields);
  }

  async markArchiveOfferAsProcessed(id: number): Promise<ArchiveOffer> {
    const offer = await this.getArchiveOffer(id);
    if (!offer) { throw new Error(`No archive offer #${id}.`); }
    offer.processed = true;

    return this.archiveOffers.save(offer);
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
