import "dotenv/config";
import { Client } from "langsmith";

async function main() {
  const client = new Client();

  // データセットを作成
  const dataset = await client.createDataset("Research-Agent-Eval-v1");

  // データセットに例を追加
  await client.createExamples([
    {
      dataset_id: dataset.id,
      inputs: { input: "2025年最新の生成AIスタートアップの動向は？" },
      outputs: {
        grand_truth: "関連する企業名、調達額、技術特徴を含む詳細なレポート",
      },
    },
    {
      dataset_id: dataset.id,
      inputs: { input: "経済学における「需要の価格弾力性」の定義を述べよ。" },
      outputs: { grand_truth: "正確な学術的定義と計算式" },
    },
    {
      dataset_id: dataset.id,
      inputs: { input: "2024年パリ五輪のマスコット名は？" },
      outputs: {
        grand_truth: "フリジア帽をモチーフにしたマスコットの名前とその由来",
      },
    },
  ]);

  console.log("Created dataset:", dataset.name);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
