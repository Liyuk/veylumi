import { CatalogProduct, TutorialLink } from "./v1-domain";

export const products: CatalogProduct[] = [
  { id: 1, brand: "Rare Beauty", name: "Soft Pinch Liquid Blush · Hope", type: "腮红", price: "$25", tone: "暖杏粉 · 自然光泽", shade: "Hope", skin: "干皮 / 混合皮", region: "欧美", latest: true, color: "#d78b78", url: "https://www.rarebeauty.com/products/soft-pinch-liquid-blush", categoryId: "blush", undertone: "warm", finish: "自然光泽", skinTags: ["dry", "combination"], shadeDepth: 3 },
  { id: 2, brand: "NARS", name: "Light Reflecting Advanced Skincare Foundation", type: "底妆", price: "$55", tone: "中性 · 中等遮瑕", shade: "L4 Deauville", skin: "干皮 / 混合皮", region: "欧美", latest: false, color: "#aa866c", url: "https://www.narscosmetics.com/USA/light-reflecting-advanced-skincare-foundation/999NAC0000141.html", categoryId: "base", undertone: "neutral", finish: "自然光泽", skinTags: ["dry", "combination"], shadeDepth: 4 },
  { id: 3, brand: "rom&nd", name: "Juicy Lasting Tint · Nucadamia", type: "唇妆", price: "$13", tone: "棕红 · 柔雾 MLBB", shade: "Nucadamia", skin: "油皮 / 混合皮", region: "日韩", latest: true, color: "#8a4f47", url: "https://www.yesstyle.com/en/romand-juicy-lasting-tint-bare-juicy-series-4-colors-25-bare-grape/info.html/pid.1100905689", categoryId: "lip", undertone: "warm", finish: "柔雾", skinTags: ["oily", "combination"], shadeDepth: 4 },
];

export const tutorials: TutorialLink[] = [
  { platform: "YouTube", creator: "Dear Peachie", title: "自然韩系通勤妆：低饱和眼妆与腮红", tags: "韩系 · 通勤 · 新手", url: "https://www.youtube.com/results?search_query=natural+korean+daily+makeup", stepIds: ["base-prep", "eye-soft"], productIds: [1, 3] },
  { platform: "小红书", creator: "Veylumi 精选", title: "中性偏暖肤色的奶茶妆步骤", tags: "奶茶妆 · 中性偏暖", url: "https://www.xiaohongshu.com/search_result?keyword=%E5%A5%B6%E8%8C%B6%E5%A6%86", stepIds: ["cheek-lip"], productIds: [1, 3] },
  { platform: "抖音", creator: "Veylumi 精选", title: "油皮底妆持妆：薄底妆与局部定妆", tags: "油皮 · 底妆 · 持妆", url: "https://www.douyin.com/search/%E6%B2%B9%E7%9A%AE%E5%BA%95%E5%A6%86", stepIds: ["base-even"], productIds: [2] },
];
