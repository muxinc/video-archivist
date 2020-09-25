import { DOWNLOAD_VIDEO_JOB_NAME } from './download-video-job/job';
import { DownloadVideoJobData } from './download-video-job/types';
import * as Queues from './queues';

export function queueDownloadVideoJob(data: DownloadVideoJobData) {
  Queues.videoDownloadQueue.add(DOWNLOAD_VIDEO_JOB_NAME, data);
}
