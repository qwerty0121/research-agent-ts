import "dotenv/config";
import { HumanMessage } from "@langchain/core/messages";
import { buildGraph } from "./graph.ts";
import type { AgentStateType } from "./states.ts";

// --- 実行コード ---
(async () => {
  const app = buildGraph();

  const initialState: Partial<AgentStateType> = {
    messages: [
      new HumanMessage(
        "2025年のAIエージェントの最新動向についてレポートを作成せよ。"
      ),
    ],
  };

  console.log("--- Agent Start ---");
  // LangSmithでトレースを有効化

  const result = await app.invoke(initialState);

  console.log("--- Agent End ---");
  console.log("最終レポート:", result.draft);

  // 最終結果をファイルに書き出すなどの処理
})();
