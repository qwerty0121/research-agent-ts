import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  // 検索結果や生成されたレポートの下書き
  draft: Annotation<string>({
    reducer: (prev, curr) => curr,
    default: () => "",
  }),
  // Reviewer からの評価コメント
  critique: Annotation<string>({
    reducer: (prev, curr) => curr,
    default: () => "",
  }),
  // 修正試行回数（無限ループ防止用）
  revision_count: Annotation<number>({
    reducer: (prev, curr) => curr,
    default: () => 0,
  }),
});

export type AgentStateType = typeof AgentState.State;
