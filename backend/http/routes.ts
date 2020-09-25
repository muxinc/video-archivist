import * as Hapi from '@hapi/hapi';
import Joi from 'joi';

import { Repo } from '../db/entities/Repo.entity';
import { Video } from '../db/entities/Video.entity';
import { responseWith } from '../helpers';
import { AppOptions } from './server';
import {
  GITHUB_WEBHOOK_SIGNATURE_HEADER,
} from '../GithubService';
import { GithubWebhookPayload } from '../types';

export async function attachRoutes(server: Hapi.Server, opts: AppOptions) {
  server.route({
    method: 'GET',
    path: '/repos',
    options: {
      response: responseWith(Joi.array().items(Repo.RepoDTO)),
    },
    handler: async (req, h) => req.getDataService().getAllRepos(),
  });

  server.route({
    method: 'GET',
    path: '/repos/{organizationName}/{repositoryName}',
    options: {
      validate: {
        params: Joi.object({
          organizationName: Joi.string().required(),
          repositoryName: Joi.string().required(),
        }),
      },
      response: responseWith(Repo.RepoDTO),
    },
    handler: async (req, h) => {
      const repo = await req.getDataService().getRepo(req.params.organizationName, req.params.repositoryName);

      if (!repo) {
        return h.response({ error: 404, message: 'Repo not found.' }).code(404);
      }

      return repo;
    }
  });

  server.route({
    method: 'GET',
    path: '/videos',
    options: {
      response: responseWith(Joi.array().items(Video.VideoDTO)),
    },
    handler: async (req, h) => req.getDataService().getAllVideos(),
  });

  server.route({
    method: 'GET',
    path: '/videos/{videoId}',
    options: {
      validate: {
        params: Joi.object({
          videoId: Joi.string().required(),
        }),
      },
      response: responseWith(Video.VideoDTO),
    },
    handler: async (req, h) => {
      const video = await req.getDataService().getVideo(req.params.videoId);

      if (!video) {
        return h.response({ error: 404, message: 'Video not found.' }).code(404);
      }

      return video;
    }
  });

  // webhook magic(tm)
  server.route({
    method: 'POST',
    path: '/webhooks/github',
    options: {
      payload: {
        parse: false, // payload will be a buffer
      },
    },
    handler: async function(req, h) {
      // we have to do this in order to validate the payload via github signing.
      const buffer = req.payload as Buffer;
      const bufferAsString = buffer.toString('utf-8');

      // this is a minor crime but it's fine
      const githubPayload: GithubWebhookPayload = JSON.parse(bufferAsString);
      const githubService = req.getGithubService();

      const isVerified = await githubService.verifyWebhookPayloadAgainstRepos(
        githubPayload,
        buffer,
        req.headers[GITHUB_WEBHOOK_SIGNATURE_HEADER],
      );
      if (!isVerified) {
        return h.response({ error: 401, message: 'Webhook unvalidated.' }).code(401);
      }

      await githubService.processGithubWebhook(githubPayload);

      return '';
    }
  })
}
