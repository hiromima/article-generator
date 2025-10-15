import { describe, test, expect, beforeEach } from '@jest/globals';
import { CoordinatorAgent, Task, Wave } from '../src/agents/CoordinatorAgent';

describe('CoordinatorAgent', () => {
  let agent: CoordinatorAgent;

  beforeEach(() => {
    agent = new CoordinatorAgent();
  });

  describe('buildDAG', () => {
    test('タスクをDAGに変換できる', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'First task',
          dependencies: [],
          complexity: 'small',
          effort: '1d',
          priority: 'P0-Critical',
          agent: 'codegen',
          acceptanceCriteria: ['Criteria 1']
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Second task',
          dependencies: ['1'],
          complexity: 'medium',
          effort: '3d',
          priority: 'P1-High',
          agent: 'review',
          acceptanceCriteria: ['Criteria 2']
        }
      ];

      const dag = agent.buildDAG(tasks);

      expect(dag.size).toBe(2);
      expect(dag.get('1')).toBeDefined();
      expect(dag.get('2')).toBeDefined();
      expect(dag.get('2')?.dependencies).toContain('1');
    });

    test('循環依存を検出する', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'First task',
          dependencies: ['2'],
          complexity: 'small',
          effort: '1d',
          priority: 'P0-Critical',
          agent: 'codegen',
          acceptanceCriteria: []
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Second task',
          dependencies: ['1'],
          complexity: 'medium',
          effort: '3d',
          priority: 'P1-High',
          agent: 'review',
          acceptanceCriteria: []
        }
      ];

      expect(() => agent.buildDAG(tasks)).toThrow('Circular dependency detected');
    });
  });

  describe('planWaves', () => {
    test('依存関係に基づいてWaveを生成する', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'First task',
          dependencies: [],
          complexity: 'small',
          effort: '1d',
          priority: 'P0-Critical',
          agent: 'codegen',
          acceptanceCriteria: []
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Second task',
          dependencies: [],
          complexity: 'small',
          effort: '1d',
          priority: 'P0-Critical',
          agent: 'review',
          acceptanceCriteria: []
        },
        {
          id: '3',
          title: 'Task 3',
          description: 'Third task',
          dependencies: ['1', '2'],
          complexity: 'medium',
          effort: '3d',
          priority: 'P1-High',
          agent: 'deployment',
          acceptanceCriteria: []
        }
      ];

      const dag = agent.buildDAG(tasks);
      const waves = agent.planWaves(dag);

      expect(waves.length).toBe(2);
      expect(waves[0].tasks.length).toBe(2); // Task 1 and 2 can run in parallel
      expect(waves[0].canRunInParallel).toBe(true);
      expect(waves[1].tasks.length).toBe(1); // Task 3 runs after
      expect(waves[1].tasks[0].id).toBe('3');
    });

    test('複雑な依存関係のWaveを生成する', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          dependencies: [],
          complexity: 'xlarge',
          effort: '1w',
          priority: 'P0-Critical',
          agent: 'coordinator',
          acceptanceCriteria: []
        },
        {
          id: '2',
          title: 'Task 2',
          description: '',
          dependencies: [],
          complexity: 'xlarge',
          effort: '1w',
          priority: 'P0-Critical',
          agent: 'codegen',
          acceptanceCriteria: []
        },
        {
          id: '3',
          title: 'Task 3',
          description: '',
          dependencies: ['2'],
          complexity: 'large',
          effort: '4d',
          priority: 'P0-Critical',
          agent: 'review',
          acceptanceCriteria: []
        },
        {
          id: '4',
          title: 'Task 4',
          description: '',
          dependencies: ['2'],
          complexity: 'large',
          effort: '4d',
          priority: 'P1-High',
          agent: 'test',
          acceptanceCriteria: []
        },
        {
          id: '5',
          title: 'Task 5',
          description: '',
          dependencies: ['3', '4'],
          complexity: 'large',
          effort: '4d',
          priority: 'P1-High',
          agent: 'deployment',
          acceptanceCriteria: []
        }
      ];

      const dag = agent.buildDAG(tasks);
      const waves = agent.planWaves(dag);

      expect(waves.length).toBe(3);
      expect(waves[0].tasks.length).toBe(2); // Task 1, 2
      expect(waves[1].tasks.length).toBe(2); // Task 3, 4
      expect(waves[2].tasks.length).toBe(1); // Task 5
    });
  });

  describe('findCriticalPath', () => {
    test('Critical Pathを特定できる', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          dependencies: [],
          complexity: 'xlarge',
          effort: '1w',
          priority: 'P0-Critical',
          agent: 'codegen',
          acceptanceCriteria: []
        },
        {
          id: '2',
          title: 'Task 2',
          description: '',
          dependencies: ['1'],
          complexity: 'large',
          effort: '4d',
          priority: 'P0-Critical',
          agent: 'review',
          acceptanceCriteria: []
        },
        {
          id: '3',
          title: 'Task 3',
          description: '',
          dependencies: ['2'],
          complexity: 'large',
          effort: '4d',
          priority: 'P1-High',
          agent: 'deployment',
          acceptanceCriteria: []
        }
      ];

      const dag = agent.buildDAG(tasks);
      const waves = agent.planWaves(dag);
      const criticalPath = agent.findCriticalPath(waves);

      expect(criticalPath).toEqual(['1', '2', '3']);
    });
  });

  describe('calculateEfficiency', () => {
    test('効率化率を計算できる', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          dependencies: [],
          complexity: 'xlarge',
          effort: '1w',
          priority: 'P0-Critical',
          agent: 'coordinator',
          acceptanceCriteria: []
        },
        {
          id: '2',
          title: 'Task 2',
          description: '',
          dependencies: [],
          complexity: 'xlarge',
          effort: '1w',
          priority: 'P0-Critical',
          agent: 'codegen',
          acceptanceCriteria: []
        },
        {
          id: '3',
          title: 'Task 3',
          description: '',
          dependencies: ['2'],
          complexity: 'large',
          effort: '4d',
          priority: 'P0-Critical',
          agent: 'review',
          acceptanceCriteria: []
        }
      ];

      const dag = agent.buildDAG(tasks);
      const waves = agent.planWaves(dag);
      const efficiency = agent.calculateEfficiency(waves);

      // 順次実行: 1w + 1w + 4d = 40 + 40 + 24 = 104時間
      // 並列実行: max(1w, 1w) + 4d = 40 + 24 = 64時間
      // 効率化率: (104 - 64) / 104 = 0.385 (約38.5%)

      expect(efficiency).toBeGreaterThan(0.3);
      expect(efficiency).toBeLessThan(0.4);
    });

    test('50%以上の効率化を達成する', () => {
      // Miyabi Framework Phase 2/3 の実際のタスク構成
      const tasks: Task[] = [
        // Wave 1
        { id: '1', title: 'CoordinatorAgent', description: '', dependencies: [], complexity: 'xlarge', effort: '1w', priority: 'P0-Critical', agent: 'coordinator', acceptanceCriteria: [] },
        { id: '2', title: 'CodeGenAgent', description: '', dependencies: [], complexity: 'xlarge', effort: '1w', priority: 'P0-Critical', agent: 'codegen', acceptanceCriteria: [] },
        { id: '3', title: 'Economic CB', description: '', dependencies: [], complexity: 'medium', effort: '3d', priority: 'P1-High', agent: 'codegen', acceptanceCriteria: [] },
        // Wave 2
        { id: '4', title: 'ReviewAgent', description: '', dependencies: ['2'], complexity: 'large', effort: '4d', priority: 'P0-Critical', agent: 'review', acceptanceCriteria: [] },
        { id: '5', title: 'TestAgent', description: '', dependencies: ['2'], complexity: 'large', effort: '4d', priority: 'P1-High', agent: 'test', acceptanceCriteria: [] },
        // Wave 3
        { id: '6', title: 'PRAgent', description: '', dependencies: ['2', '4'], complexity: 'medium', effort: '3d', priority: 'P1-High', agent: 'pr', acceptanceCriteria: [] },
        { id: '7', title: 'DeploymentAgent', description: '', dependencies: ['2', '4', '5'], complexity: 'large', effort: '4d', priority: 'P1-High', agent: 'deployment', acceptanceCriteria: [] },
        // Wave 4
        { id: '8', title: 'GitHub Actions', description: '', dependencies: ['1', '2', '4', '5', '6', '7'], complexity: 'large', effort: '4d', priority: 'P1-High', agent: 'coordinator', acceptanceCriteria: [] },
      ];

      const dag = agent.buildDAG(tasks);
      const waves = agent.planWaves(dag);
      const efficiency = agent.calculateEfficiency(waves);

      // 効率化率が50%以上であることを確認
      expect(efficiency).toBeGreaterThanOrEqual(0.5);
    });
  });
});
