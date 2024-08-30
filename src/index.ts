import { Context, segment } from "koishi";
import Schema from "schemastery";

export const name = "javbus";

export interface Config {
  apiPrefix: string;
  allowDownloadLink: boolean;
  allowPreviewCover: boolean;
}

export const Config = Schema.object({
  description: Schema.string()
    .default("这里不用填写东西")
    .description(
      "该插件请低调使用, 请勿配置于QQ或者是其他国内APP平台, 带来的后果请自行承担"
    ),
  apiPrefix: Schema.string()
    .default("")
    .required()
    .description("请填写你的api地址前缀（https://www.xxx.com/）"),
  allowDownloadLink: Schema.boolean()
    .default(false)
    .description("是否允许返回磁力链接"),
  allowPreviewCover: Schema.boolean()
    .default(false)
    .description("是否允许返回封面预览(弃用，不返回)"),
});

export const movieDetailApi = "/movies/";

export const magnetsDetailApi = "/magnets/";

export function apply(ctx: Context, config: Config) {
  interface MovieDetails {
    title?: string;
    id?: number;
    gid?: number;
    date?: string;
    uc?: string;
    stars?: Array<{ name: string }>;
    magnets: string;
  }
  async function fetchMovieDetails(number: string): Promise<MovieDetails> {
    const movieUrl = config.apiPrefix + movieDetailApi + number;
    // console.log("Fetching details from:", movieUrl);
    let result = {
      magnets: "",
    };
    // 第一个请求
    const movieData = await ctx.http.get(movieUrl);
    const { title, id, gid, date, uc, stars } = movieData;
    result = { ...result, ...{ title, id, gid, date, uc, stars } };

    if (config.allowDownloadLink) {
      // 使用第一个请求的返回数据来构造第二个请求的参数
      // https://jav.hina.asia/api/magnets/JUQ-434?gid=56326057355&uc=0
      const magnetsUrl =
        config.apiPrefix + magnetsDetailApi + `${id}?gid=${gid}&uc=${uc}`;
      //   console.log("Fetching details from:", magnetsUrl);

      // 第二个请求
      const magnetsList = await ctx.http.get(magnetsUrl);
      //   console.log("magnetsList:", magnetsList);

      if (magnetsList.length > 0) {
        result.magnets = `磁力: ${magnetsList[0].size},${magnetsList[0].shareDate}\n${magnetsList[0].link}`;

        if (magnetsList.length > 1) {
          result.magnets += `\n磁力2: ${
            magnetsList[magnetsList.length - 1].size
          },${magnetsList[magnetsList.length - 1].shareDate}\n${
            magnetsList[magnetsList.length - 1].link
          }`;
        }
      }
    }
    return result;
  }

  ctx
    .command("jav <number:text>", "查找javbus番号")
    .action(async ({ session }, number) => {
      try {
        if (!number) return "请提供番号!";
        const result = await fetchMovieDetails(number);
        // console.log("result:", result);
        const { title, id, gid, date, uc, stars, magnets } = result;
        let str = `标题: ${title}\n发行日期: ${date}\n女优: ${stars
          .map((star) => star.name)
          .join(",")}\n${magnets}`;
        await session.sendQueued(` ${str}`);
      } catch (err) {
        console.log(err);
        return `发生错误!请检查发送的番号是否正确(必须带横杠xxx-123);  ${err}`;
      }
    });
}
