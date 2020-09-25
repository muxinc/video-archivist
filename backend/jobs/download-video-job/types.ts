import * as RT from 'runtypes';

export const DownloadVideoJobData = RT.Record({
  archiveOfferId: RT.Number,
});
export type DownloadVideoJobData = RT.Static<typeof DownloadVideoJobData>;
