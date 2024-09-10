import { getLinks } from "./blue.ts";
import { load } from "cheerio";

const primewireBase = 'https://www.primewire.tf';
const primewireApiKey = atob('bHpRUHNYU0tjRw==');

async function search(imdbId: string) {
  const searchResult = await fetch(`${primewireBase}/api/v1/show?key=${primewireApiKey}&imdb_id=${imdbId}`);
  return await searchResult.json().then((searchResult) => {
    return searchResult.id;
  });
}

async function getStreams(title: string) {
  const titlePage = load(title);
  const userData = titlePage("#user-data").attr("v");
  if (!userData) throw new NotFoundError("No user data found");

  const links = getLinks(userData);

  const embeds = [];

  if (!links) throw new NotFoundError("No links found");

  for (const link in links) {
    if (link.includes(link)) {
      const element = titlePage(`.propper-link[link_version='${link}']`);
      const sourceName = element.parent().parent().parent().find(".version-host").text().trim();
      let embedId;
      let quality = element.parent().find("span").text() ?? "AUTO";
      switch (sourceName) {
        case "dood.watch":
          embedId = "doodstream";
          break;
        case "streamtape.com":
          embedId = "streamtape";
          break;
        default:
          embedId = null;
      }
      if (!embedId) continue;
      embeds.push({
        url: `${primewireBase}/links/go/${links[link]}`,
        quality: quality,
        embedId,
      });
    }
  }

  return embeds;
}

export async function scrapeMovie(imdbId) {
  const searchResult = await search(imdbId);

  const title = await fetch(`${primewireBase}/movie/${searchResult}`);
  const titleResp = await title.text();
  const embeds = await getStreams(titleResp);

  return {
    embeds,
  };
}
export async function scrapeShow(imdbId, seasonId, episodeId) {
  console.log(imdbId, seasonId, episodeId);
  if (!imdbId) throw new Error("No imdbId provided");
  const searchResult = await search(imdbId);

  const _season = await fetch(`${primewireBase}/tv/${searchResult}`, {});
  const season = await _season.text();
  const seasonPage = load(season);

  const episodeLink = seasonPage(`.show_season[data-id='${seasonId}'] > div > a`)
    .toArray()
    .find((link) => {
      return link.attribs.href.includes(`-episode-${episodeId}`);
    })?.attribs.href;

  if (!episodeLink) throw new Error("No episode links found");

  const _title = await fetch(`${primewireBase}/${episodeLink}`);
  const title = await _title.text();
  const embeds = await getStreams(title);

  return {
    embeds,
  };
}

// test
// console.log(await scrapeShow("IMDB", 1, 1));
// console.log(await scrapeMovie("IMDB"));
