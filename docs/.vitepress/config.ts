import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Magic Lottery",
  description: "A magic library makes your lucky draws simpler.",
  base: "/magic-lottery/",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "指南", link: "/guide" },
      { text: "API", link: "/api" },
    ],
    sidebar: [
      {
        text: "入门",
        items: [
          { text: "简介", link: "/" },
          { text: "快速开始", link: "/guide" },
        ],
      },
      {
        text: "参考",
        items: [{ text: "API 文档", link: "/api" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/logeast/magic-lottery" },
    ],
    footer: {
      message: "Released under the MIT License.",
    },
  },
});
