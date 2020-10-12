import * as Path from 'path';

export type MungeM3U8File = { originalUrl: string, targetPath: string };
export type MungeM3U8Result = {
  mungedText: string,
  files: Array<MungeM3U8File>,
}

export type ExtTagKV = [string, string | undefined];
export type ParsedExtTags = { tagName: string, kvs: Array<ExtTagKV> };

export function parseExtTags(line: string): ParsedExtTags {
  // this regex is, roughly speaking, "split on commas but not in quotes"
  const [tagName, allTags] = line.substring(1).split(':', 2);
  if (!tagName) {
    throw new Error(`Parsing line '${line}' - no tag found`);
  }
  const kvs: Array<[string, string | undefined]> = [];

  if (allTags) {
    // this hefty chonk is "split on commas, but not if it's quoted". It doesn't support
    // slash-escaped quotes inside the string but that's fine, any of those would be
    // URL encoded here anyway (and the regex would possibly actually shoot back).
    const tokens = allTags.split(/,+(?=(?:(?:[^"]*"){2})*[^"]*$)/g);

    // So this is a weird one and I don't have a great way to handle it; the
    // RFC includes strings for user input but non-strings (bare words) for
    // enumerated values, like `EXT-X-KEY:METHOD=AES-128:KEY="somekey.file"`.
    // As such the user of this is just gonna have to remember, if they're
    // messing with user input like `URI=` attributes, to add strings themselves.
    // I do this as a for loop so I can throw.
    for (const token of tokens) {
      const [k, v] = token.split('=', 2);
      if (!k) {
        throw new Error(`Parsing line '${line}' - no key found in token.`);
      }

      kvs.push([k, v]);
    }
  }

  return { tagName, kvs };
}

export function extTagsToM3U8Format(tags: ParsedExtTags) {
  let str = "#";
  str = str + tags.tagName;

  if (tags.kvs.length > 0) {
    str = str + ":";
    str = str + tags.kvs.map(kv => (kv[1] ? [kv[0], kv[1]] : [kv[0]]).join('=')).join(',');
  }

  return str;
}

export function canonicalizeUrl(m3u8Url: string, mediaUrl: string): string {
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    return mediaUrl;
  }

  return Path.dirname(m3u8Url) + "/" + mediaUrl;
}
