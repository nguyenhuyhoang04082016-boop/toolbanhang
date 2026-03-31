import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { AdSegment } from '../types';

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Load ffmpeg
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export interface MergeOptions {
  voiceUrl?: string;
  musicUrl?: string;
  onProgress?: (progress: number) => void;
}

export async function mergeSceneVideos(
  scenes: AdSegment[],
  options: MergeOptions = {}
): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const { voiceUrl, musicUrl, onProgress } = options;

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(progress);
  });

  // 1. Filter out scenes without videoUrl
  const validScenes = scenes.filter(s => s.videoUrl);
  if (validScenes.length === 0) {
    throw new Error('No videos to merge');
  }

  // 2. Load all video files
  const inputFiles: string[] = [];
  for (let i = 0; i < validScenes.length; i++) {
    const fileName = `input${i}.mp4`;
    await ffmpeg.writeFile(fileName, await fetchFile(validScenes[i].videoUrl!));
    inputFiles.push(fileName);
  }

  // 3. Create concat list
  const concatList = inputFiles.map(f => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', concatList);

  // 4. Merge videos first (without audio mixing yet)
  // We'll do it in one go if possible, but concat usually needs a separate step
  await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'merged_temp.mp4']);

  let finalOutput = 'merged_temp.mp4';
  let inputs = ['-i', 'merged_temp.mp4'];
  let filterComplex = '';
  let audioInputs: string[] = [];
  let currentInputIdx = 1;

  // 5. Handle Voiceover
  if (voiceUrl) {
    await ffmpeg.writeFile('voice.mp3', await fetchFile(voiceUrl));
    inputs.push('-i', 'voice.mp3');
    audioInputs.push(`[${currentInputIdx}:a]`);
    currentInputIdx++;
  }

  // 6. Handle Music
  if (musicUrl) {
    await ffmpeg.writeFile('music.mp3', await fetchFile(musicUrl));
    inputs.push('-stream_loop', '-1', '-i', 'music.mp3');
    audioInputs.push(`[${currentInputIdx}:a]`);
    currentInputIdx++;
  }

  // 7. Mix Audio and Normalize
  if (audioInputs.length > 0) {
    if (audioInputs.length > 1) {
      // Mix multiple audio sources
      filterComplex = `${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=first:dropout_transition=2[aout];[aout]loudnorm[final_a]`;
    } else {
      // Just normalize the single audio source
      filterComplex = `${audioInputs[0]}loudnorm[final_a]`;
    }
    
    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '0:v', // Use video from first input
      '-map', '[final_a]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
      'final_video.mp4'
    ];
    
    await ffmpeg.exec(args);
    finalOutput = 'final_video.mp4';
  }

  // 8. Read result
  const data = await ffmpeg.readFile(finalOutput);
  const url = URL.createObjectURL(new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' }));

  // Cleanup
  await ffmpeg.deleteFile('concat.txt');
  for (const f of inputFiles) await ffmpeg.deleteFile(f);
  await ffmpeg.deleteFile('merged_temp.mp4');
  if (voiceUrl) await ffmpeg.deleteFile('voice.mp3');
  if (musicUrl) await ffmpeg.deleteFile('music.mp3');
  if (finalOutput === 'final_video.mp4') await ffmpeg.deleteFile('final_video.mp4');

  return url;
}
