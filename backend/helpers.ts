import { RouteOptionsResponse } from '@hapi/hapi';
import * as Joi from 'joi';

export function responseWith(
  schema: Joi.ObjectSchema | Joi.ArraySchema,
): RouteOptionsResponse {
  return {
    modify: true,
    schema: schema.options({ stripUnknown: true }),
  };
}
