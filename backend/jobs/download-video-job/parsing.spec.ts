import { canonicalizeUrl, extTagsToM3U8Format, parseExtTags } from './parsing';

describe("canonicalizeUrl", () => {
  it('should handle the non-schema case', () => {
    const m3u8Url = "https://example.com/playlist.m3u8";
    const relativeUrl = "foo/bar/baz.txt";

    const result = canonicalizeUrl(m3u8Url, relativeUrl);
    expect(result).toBe("https://example.com/foo/bar/baz.txt");
  });

  it('should handle the schema case', () => {
    const m3u8Url = "https://example.com/playlist.m3u8";
    const absoluteUrl = "https://example.net/foo/bar/baz.txt";

    const result = canonicalizeUrl(m3u8Url, absoluteUrl);
    expect(result).toBe(absoluteUrl);
  });
});

describe("m3u8 ext tags", () => {
  it("should pass through solo tags like #EXTM3U", () => {
    const line = "#EXTM3U";

    const tags = parseExtTags(line);
    const rebuiltLine = extTagsToM3U8Format(tags);

    expect(rebuiltLine).toBe(line);
  });

  it("should pass through tags with arbitrary keys that have no values", () => {
    const line = "#EXT-X-MEDIA-SEQUENCE:1";

    const tags = parseExtTags(line);
    const rebuiltLine = extTagsToM3U8Format(tags);

    expect(rebuiltLine).toBe(line);
  });

  it("should pass through quoted arguments, even when changed", () => {
    const line = "#EXT-X-KEY:METHOD=SAMPLE-AES,URI=\"data_0\"";
    const replacedUrl = "https://example.com/mydata.pem";

    let tags = parseExtTags(line);

    tags = {
      ...tags,
      kvs: tags.kvs.map(kv => {
        if (kv[0] === "URI") {
          // as noted in code, re-quoting a captured string is the consuming code's job
          // as we can't practically detect what fields require quoting and what fields don't.
          return ["URI", "\"" + replacedUrl + "\""]
        } else {
          return kv;
        }
      })
    }

    const rebuiltLine = extTagsToM3U8Format(tags);

    expect(rebuiltLine).toBe(line.replace("data_0", replacedUrl));
  });
});
