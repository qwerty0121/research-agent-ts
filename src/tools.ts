import { TavilySearch } from "@langchain/tavily";

// Tavily APIキーは環境変数から自動で読み込まれます
export const searchTool = new TavilySearch({
  maxResults: 5, // 検索結果の最大数
});

export const tools = [searchTool];
