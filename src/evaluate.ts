import "dotenv/config";
import { buildGraph } from "./graph.ts";
import { HumanMessage } from "@langchain/core/messages";
import { evaluate } from "langsmith/evaluation";
import { createLLMAsJudge } from "openevals";

/**
 * 評価対象となる関数
 * @param inputs データセットのinputs
 * @returns 出力結果
 */
async function target(inputs: Record<string, any>) {
  const app = buildGraph();

  const result = await app.invoke({
    messages: [new HumanMessage(String(inputs.input ?? ""))],
  });

  return { answer: result.draft };
}

/** evaluator */
const correctnessEvaluator = createLLMAsJudge({
  prompt: `あなたは専門的な校閲者です。
      ユーザーの質問に対して、生成されたレポートが以下の基準を満たしているか1〜5点で採点してください。
      1. 検索結果に基づいた正確な事実が書かれているか。
      2. 構造（タイトル、結論）が整っているか。
      3. 出典が明記されているか。`,
  model: "openai:o3-mini",
});

/**
 * 評価を実行する
 * @param datasetName データセット名
 */
async function runEvaluation(datasetName: string) {
  console.log(`--- Evaluation Start for Dataset: ${datasetName} ---`);

  await evaluate(target, {
    data: datasetName,
    evaluators: [correctnessEvaluator],
    experimentPrefix: "research-agent-eval",
    maxConcurrency: 1,
  });

  console.log(
    "--- Evaluation Runs Completed. Check LangSmith Dashboard for Scores. ---"
  );
}

runEvaluation("Research-Agent-Eval-v1");
