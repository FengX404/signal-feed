import { Orchestrator } from './services/orchestrator';

function parseArgs(): { days: number } {
  const args = process.argv.slice(2);
  let days = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      if (isNaN(days) || days < 1) {
        console.error('错误: --days 参数必须是正整数');
        process.exit(1);
      }
      i++;
    }
  }

  return { days };
}

async function main(): Promise<void> {
  const orchestrator = new Orchestrator();
  const { days } = parseArgs();

  if (days > 1) {
    console.log(`\n获取最近 ${days} 天的简报`);
  }

  await orchestrator.execute({ days });
  orchestrator.stop();
}

main().catch((error) => {
  console.error('程序运行出错:', error);
  process.exit(1);
});
