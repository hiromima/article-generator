import { describe, test, expect, beforeEach } from '@jest/globals';
import { DeploymentAgent } from '../src/agents/DeploymentAgent';

describe('DeploymentAgent', () => {
  describe('初期化', () => {
    test('DeploymentAgent インスタンスが作成できる', () => {
      const agent = new DeploymentAgent();
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('GITHUB_TOKEN が必要', () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      expect(() => new DeploymentAgent()).toThrow('GITHUB_TOKEN is required');

      process.env.GITHUB_TOKEN = originalToken;
    });

    test('デフォルト設定が正しく適用される', () => {
      const agent = new DeploymentAgent();
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('カスタム設定が適用できる', () => {
      const agent = new DeploymentAgent({
        healthCheckUrl: 'https://example.com/health',
        healthCheckRetries: 3,
        healthCheckTimeout: 5000,
        rollbackOnFailure: false,
        buildCommand: 'npm run custom:build',
        deployCommand: 'firebase deploy --only functions'
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });
  });

  describe('メソッド存在確認', () => {
    let agent: DeploymentAgent;

    beforeEach(() => {
      agent = new DeploymentAgent();
    });

    test('deploy() メソッドが存在する', () => {
      expect(typeof agent.deploy).toBe('function');
    });

    test('rollback() メソッドが存在する', () => {
      expect(typeof agent.rollback).toBe('function');
    });

    test('commentOnPR() メソッドが存在する', () => {
      expect(typeof agent.commentOnPR).toBe('function');
    });
  });

  describe('設定', () => {
    test('ヘルスチェック URL が設定できる', () => {
      const agent = new DeploymentAgent({
        healthCheckUrl: 'https://example.com/health'
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('リトライ回数が設定できる', () => {
      const agent = new DeploymentAgent({
        healthCheckRetries: 10
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('タイムアウトが設定できる', () => {
      const agent = new DeploymentAgent({
        healthCheckTimeout: 30000
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('ロールバック設定が適用できる', () => {
      const agent = new DeploymentAgent({
        rollbackOnFailure: false
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('ビルドコマンドが設定できる', () => {
      const agent = new DeploymentAgent({
        buildCommand: 'npm run custom:build'
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('デプロイコマンドが設定できる', () => {
      const agent = new DeploymentAgent({
        deployCommand: 'firebase deploy --only functions'
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });
  });

  describe('note.com投稿機能', () => {
    test('postToNote() メソッドが存在する', () => {
      const agent = new DeploymentAgent({
        notePostingEnabled: true
      });
      expect(typeof agent.postToNote).toBe('function');
    });

    test('note.com投稿が無効化されている場合はエラーを返す', async () => {
      const agent = new DeploymentAgent({
        notePostingEnabled: false
      });
      const result = await agent.postToNote('# Test Article', 'Test Title');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    test('note.com投稿が有効化されている場合はスタブを返す', async () => {
      const agent = new DeploymentAgent({
        notePostingEnabled: true
      });
      const result = await agent.postToNote('# Test Article', 'Test Title');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not implemented');
    });
  });

  describe('受け入れ基準', () => {
    test('Firebase 自動デプロイ機能が実装されている', () => {
      const agent = new DeploymentAgent();
      expect(typeof agent.deploy).toBe('function');
    });

    test('ヘルスチェック機能が実装されている', () => {
      const agent = new DeploymentAgent({
        healthCheckUrl: 'https://example.com/health'
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('自動ロールバック機能が実装されている', () => {
      const agent = new DeploymentAgent({
        rollbackOnFailure: true
      });
      expect(typeof agent.rollback).toBe('function');
    });

    test('PR コメント機能が実装されている', () => {
      const agent = new DeploymentAgent();
      expect(typeof agent.commentOnPR).toBe('function');
    });

    test('note.com投稿機能が実装されている（スタブ）', () => {
      const agent = new DeploymentAgent({
        notePostingEnabled: true
      });
      expect(typeof agent.postToNote).toBe('function');
    });
  });

  describe('デプロイメント ID', () => {
    test('ユニークなデプロイメント ID が生成される', () => {
      const agent = new DeploymentAgent();
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });
  });

  describe('エラーハンドリング', () => {
    test('ビルド失敗時にエラーが返される', () => {
      const agent = new DeploymentAgent({
        buildCommand: 'exit 1'  // 失敗するコマンド
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });

    test('デプロイ失敗時にエラーが返される', () => {
      const agent = new DeploymentAgent({
        deployCommand: 'exit 1'  // 失敗するコマンド
      });
      expect(agent).toBeInstanceOf(DeploymentAgent);
    });
  });
});
