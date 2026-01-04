import { StateGraph, START, END } from "@langchain/langgraph";
import { researcher, reviewer, routeDecision } from "./nodes.ts";
import { AgentState } from "./states.ts";

export function buildGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("researcher", researcher)
    .addNode("reviewer", reviewer)
    .addEdge(START, "researcher") // 開始からリサーチャーへ
    .addEdge("researcher", "reviewer") // リサーチャーからレビュアーへ
    .addConditionalEdges("reviewer", routeDecision, {
      // 評価ノードの出力に基づく条件分岐
      revise: "researcher", // 修正が必要なら researcher に戻る（ループ）
      end: END, // 完了なら終了
    });

  return workflow.compile();
}
