import { ChatOpenAI } from "@langchain/openai";
import type { AgentStateType } from "./states.ts";
import { searchTool } from "./tools.ts";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  temperature: 0.1,
  modelName: "gpt-4o-mini",
});

// --- Reserch/RAG プロンプトの定義 ---
function buildResearcherPrompt() {
  return PromptTemplate.fromTemplate(`あなたは世界トップクラスの専門家であり、リサーチレポートの作成者です。
  ユーザーの質問に正確かつ詳細に答えるため、以下の検索結果と、過去のレビューアのフィードバックを考慮して、レポートの下書きを生成してください。
  
  --- ユーザーの質問 (Query) ---
  {query}
  
  --- Web検索結果 ---
  {searchResults}
  
  --- レビューアからの前回の修正指示 (Critique) ---
  {critique}
  
  --- 指示 ---
  1. レポートは、検索結果に基づき、質問に完全に答える形で構成してください。
  2. 修正指示がある場合は、その点を重点的に改善してください。
  3. 出典（URLやタイトルなど）を適切に明記してください。
  4. レポートのタイトルと、結論を必ず含めてください。
  
  【レポート下書き】`);
}

// --- Researcher Node (検索・下書き作成) ---
export async function researcher(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  console.log("-> Researcher: Web検索を開始します...");

  const query = state.messages.slice(-1)[0]?.content.toString() ?? "";
  const critique = state.critique;

  // 1. Web検索の実行
  const searchResults = await searchTool.invoke({ query });
  const formattedResults = searchResults.results
    .map(
      (r: { url: string; content: string }) => `[Source: ${r.url}] ${r.content}`
    )
    .join("\n---\n");

  console.log(
    `-> Researcher: 検索結果 ${searchResults.results.length}件を取得しました。`
  );

  // 2. RAGによる下書き生成
  const prompt = buildResearcherPrompt();

  const chain = RunnableSequence.from([prompt, model]);

  const response = await chain.invoke({
    query,
    searchResults: formattedResults,
    critique: critique || "今回は初稿作成、または修正指示はありません。",
  });
  const draft = response.content.toString();

  console.log(
    `-> Researcher: レポート下書きを生成しました (修正回数: ${
      state.revision_count + 1
    })`
  );

  return { draft, revision_count: state.revision_count + 1 };
}

// --- Reviewer Promptの定義 ---
function buildReviewerPrompt() {
  return PromptTemplate.fromTemplate(`あなたは厳格で客観的なレビューアです。以下の質問と、それに対するレポート下書きを評価してください。
    
    --- 評価基準 ---
    1. 正確性: レポートの内容はWeb検索結果に基づき、事実と正確か？
    2. 網羅性: 質問「{query}」に完全に答えているか？
    3. 構造: タイトル、結論、出典が適切に記載されているか？
    
    --- 指示 ---
    * 改善が必要な場合: 具体的な修正指示（Critique）を記述してください。
    * 完璧な場合: **ACCEPT** とだけ記述してください。他の文字は含めないでください。
    
    【レポート下書き】\n{draft}`);
}

// --- Reviewer Node (評価・判断) ---
export async function reviewer(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  // LLMを使って draft を評価し、critiqueを生成...
  console.log("-> Reviewer: 下書きの品質を評価中...");

  const query = state.messages.slice(-1)[0]?.content.toString() ?? "";

  const chain = RunnableSequence.from([buildReviewerPrompt(), model]);

  const response = await chain.invoke({
    query,
    draft: state.draft,
  });
  let critique = response.content.toString().trim();

  // 強制的にACCEPT/修正指示のいずれかを出力させるための後処理
  if (!critique.includes("ACCEPT")) {
    // 修正指示とみなす
    console.log(`-> Reviewer Critique: 修正が必要です。`);
    // critique はそのままStateに渡す
  } else {
    critique = "ACCEPT";
    console.log(`-> Reviewer Critique: ACCEPT (品質良好)。`);
  }

  return { critique };
}

// 最大リトライ回数
const MAX_REVISIONS = 3;

// --- Edge (条件分岐) ---
export function routeDecision(state: AgentStateType): "end" | "revise" {
  if (state.critique === "ACCEPT") {
    // 評価通過した場合
    console.log("-> Router: 最終レポートを提出し、終了します。");
    return "end";
  }

  if (state.revision_count >= MAX_REVISIONS) {
    // 最大リトライ回数に達した場合
    console.log(
      `-> Router: 最大修正回数(${MAX_REVISIONS}回)に達しました。レポートを提出し、終了します。`
    );
    return "end";
  }

  // 修正が必要な場合
  console.log("-> Router: 修正がありました。Researcherに戻ります。");
  return "revise";
}
