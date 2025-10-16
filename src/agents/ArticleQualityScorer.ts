/**
 * 記事品質スコアリングシステム
 *
 * 4つの評価軸で記事を評価:
 * 1. 構造評価 (Structure)
 * 2. コンテンツ評価 (Content)
 * 3. SEO評価 (SEO)
 * 4. リンク評価 (Links)
 *
 * 総合スコア80点以上で自動承認
 */

/**
 * 記事品質スコア
 */
export interface ArticleQualityScore {
  structure: StructureScore;        // 構造評価
  content: ContentScore;            // コンテンツ評価
  seo: SEOScore;                    // SEO評価
  links: LinksScore;                // リンク評価
  overall: number;                  // 総合評価（平均）
  threshold: number;                // 合格ライン（デフォルト: 80）
  passed: boolean;                  // 合否
  feedback: string[];               // 改善提案
  timestamp: Date;                  // 評価日時
}

/**
 * 構造評価
 */
export interface StructureScore {
  score: number;                    // スコア（0-100）
  headingHierarchy: number;         // 見出し階層スコア（0-100）
  paragraphLength: number;          // 段落の長さスコア（0-100）
  listUsage: number;                // リスト活用スコア（0-100）
  codeBlockUsage: number;           // コードブロック活用スコア（0-100）
  details: StructureDetails;
}

/**
 * 構造詳細
 */
export interface StructureDetails {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  paragraphCount: number;
  avgParagraphLength: number;       // 平均段落長
  listCount: number;
  codeBlockCount: number;
}

/**
 * コンテンツ評価
 */
export interface ContentScore {
  score: number;                    // スコア（0-100）
  wordCount: number;                // 文字数スコア（0-100）
  readability: number;              // 可読性スコア（0-100）
  uniqueness: number;               // 独自性スコア（0-100）
  details: ContentDetails;
}

/**
 * コンテンツ詳細
 */
export interface ContentDetails {
  totalWords: number;
  totalCharacters: number;
  sentences: number;
  avgSentenceLength: number;
  readingTime: number;              // 読了時間（分）
}

/**
 * SEO評価
 */
export interface SEOScore {
  score: number;                    // スコア（0-100）
  keywordDensity: number;           // キーワード密度スコア（0-100）
  metaDescription: number;          // メタディスクリプションスコア（0-100）
  internalLinks: number;            // 内部リンクスコア（0-100）
  details: SEODetails;
}

/**
 * SEO詳細
 */
export interface SEODetails {
  targetKeywords: string[];
  keywordOccurrences: Map<string, number>;
  keywordDensityPercent: number;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  internalLinkCount: number;
}

/**
 * リンク評価
 */
export interface LinksScore {
  score: number;                    // スコア（0-100）
  validity: number;                 // 有効性スコア（0-100）
  relevance: number;                // 関連性スコア（0-100）
  details: LinksDetails;
}

/**
 * リンク詳細
 */
export interface LinksDetails {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  externalLinks: number;
  internalLinks: number;
}

/**
 * ArticleQualityScorer
 *
 * 記事の品質を総合的に評価し、スコアリングする
 */
export class ArticleQualityScorer {
  private threshold: number;

  constructor(threshold: number = 80) {
    this.threshold = threshold;
  }

  /**
   * 記事を評価
   *
   * @param content - 記事コンテンツ（Markdown）
   * @param keywords - SEOキーワード（オプション）
   * @returns 記事品質スコア
   */
  async evaluateArticle(content: string, keywords: string[] = []): Promise<ArticleQualityScore> {
    console.log('📊 Evaluating article quality...');

    // 1. 構造評価
    const structure = this.evaluateStructure(content);
    console.log(`  📐 Structure: ${structure.score}/100`);

    // 2. コンテンツ評価
    const contentScore = this.evaluateContent(content);
    console.log(`  📝 Content: ${contentScore.score}/100`);

    // 3. SEO評価
    const seo = this.evaluateSEO(content, keywords);
    console.log(`  🔍 SEO: ${seo.score}/100`);

    // 4. リンク評価
    const links = await this.evaluateLinks(content);
    console.log(`  🔗 Links: ${links.score}/100`);

    // 総合評価
    const overall = Math.round(
      (structure.score + contentScore.score + seo.score + links.score) / 4
    );

    const passed = overall >= this.threshold;

    // フィードバック生成
    const feedback = this.generateFeedback({
      structure,
      content: contentScore,
      seo,
      links,
      overall,
      threshold: this.threshold,
      passed,
      feedback: [],
      timestamp: new Date()
    });

    console.log('');
    console.log(`✅ Overall score: ${overall}/100 ${passed ? '(PASSED)' : '(FAILED)'}`);

    return {
      structure,
      content: contentScore,
      seo,
      links,
      overall,
      threshold: this.threshold,
      passed,
      feedback,
      timestamp: new Date()
    };
  }

  /**
   * 構造を評価
   */
  private evaluateStructure(content: string): StructureScore {
    // 見出しをカウント
    const h1Count = (content.match(/^# .+$/gm) || []).length;
    const h2Count = (content.match(/^## .+$/gm) || []).length;
    const h3Count = (content.match(/^### .+$/gm) || []).length;

    // 段落をカウント
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim() && !p.match(/^#{1,6} /));
    const paragraphCount = paragraphs.length;
    const avgParagraphLength = paragraphCount > 0
      ? Math.round(paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphCount)
      : 0;

    // リスト・コードブロックをカウント
    const listCount = (content.match(/^[\-\*\+] .+$/gm) || []).length;
    const codeBlockCount = (content.match(/```/g) || []).length / 2;

    // スコア計算
    const headingHierarchy = this.scoreHeadingHierarchy(h1Count, h2Count, h3Count);
    const paragraphLength = this.scoreParagraphLength(avgParagraphLength);
    const listUsage = this.scoreListUsage(listCount, paragraphCount);
    const codeBlockUsage = this.scoreCodeBlockUsage(codeBlockCount);

    const score = Math.round(
      (headingHierarchy + paragraphLength + listUsage + codeBlockUsage) / 4
    );

    return {
      score,
      headingHierarchy,
      paragraphLength,
      listUsage,
      codeBlockUsage,
      details: {
        h1Count,
        h2Count,
        h3Count,
        paragraphCount,
        avgParagraphLength,
        listCount,
        codeBlockCount
      }
    };
  }

  /**
   * 見出し階層をスコアリング
   */
  private scoreHeadingHierarchy(h1: number, h2: number, h3: number): number {
    // 理想: H1=1, H2=3-6, H3=任意
    let score = 0;

    // H1が1つ
    if (h1 === 1) score += 40;
    else if (h1 === 0) score += 0;
    else score += 20; // 複数H1は減点

    // H2が3-6個
    if (h2 >= 3 && h2 <= 6) score += 40;
    else if (h2 >= 1 && h2 < 3) score += 30;
    else if (h2 > 6) score += 25;

    // H3があれば加点
    if (h3 > 0) score += 20;

    return Math.min(score, 100);
  }

  /**
   * 段落の長さをスコアリング
   */
  private scoreParagraphLength(avgLength: number): number {
    // 理想: 200-300文字
    if (avgLength >= 200 && avgLength <= 300) return 100;
    if (avgLength >= 150 && avgLength < 200) return 85;
    if (avgLength > 300 && avgLength <= 400) return 85;
    if (avgLength >= 100 && avgLength < 150) return 70;
    if (avgLength > 400 && avgLength <= 500) return 70;
    if (avgLength < 100) return 50;
    if (avgLength > 500) return 50;
    return 30;
  }

  /**
   * リスト活用をスコアリング
   */
  private scoreListUsage(listCount: number, paragraphCount: number): number {
    if (paragraphCount === 0) return 50;

    const ratio = listCount / paragraphCount;

    // 理想: 段落の20-40%にリスト
    if (ratio >= 0.2 && ratio <= 0.4) return 100;
    if (ratio >= 0.1 && ratio < 0.2) return 80;
    if (ratio > 0.4 && ratio <= 0.6) return 80;
    if (ratio > 0 && ratio < 0.1) return 60;
    if (ratio > 0.6) return 60;
    return 40; // リストなし
  }

  /**
   * コードブロック活用をスコアリング
   */
  private scoreCodeBlockUsage(codeBlockCount: number): number {
    // テック記事の場合はコードブロックが重要
    if (codeBlockCount >= 3) return 100;
    if (codeBlockCount === 2) return 80;
    if (codeBlockCount === 1) return 60;
    return 40; // コードブロックなしでも40点
  }

  /**
   * コンテンツを評価
   */
  private evaluateContent(content: string): ContentScore {
    // 文字数・単語数
    const totalCharacters = content.length;
    const totalWords = content.split(/\s+/).length;

    // 文をカウント
    const sentences = content.split(/[。.!?]/).filter(s => s.trim()).length;
    const avgSentenceLength = sentences > 0
      ? Math.round(totalCharacters / sentences)
      : 0;

    // 読了時間（400文字/分）
    const readingTime = Math.ceil(totalCharacters / 400);

    // スコア計算
    const wordCount = this.scoreWordCount(totalWords);
    const readability = this.scoreReadability(avgSentenceLength);
    const uniqueness = 80; // TODO: 実際のコピペチェック実装

    const score = Math.round((wordCount + readability + uniqueness) / 3);

    return {
      score,
      wordCount,
      readability,
      uniqueness,
      details: {
        totalWords,
        totalCharacters,
        sentences,
        avgSentenceLength,
        readingTime
      }
    };
  }

  /**
   * 文字数をスコアリング
   */
  private scoreWordCount(words: number): number {
    // 理想: 2000文字以上
    if (words >= 2000) return 100;
    if (words >= 1500) return 90;
    if (words >= 1000) return 80;
    if (words >= 500) return 60;
    return 40;
  }

  /**
   * 可読性をスコアリング
   */
  private scoreReadability(avgSentenceLength: number): number {
    // 理想: 1文50-80文字
    if (avgSentenceLength >= 50 && avgSentenceLength <= 80) return 100;
    if (avgSentenceLength >= 40 && avgSentenceLength < 50) return 85;
    if (avgSentenceLength > 80 && avgSentenceLength <= 100) return 85;
    if (avgSentenceLength >= 30 && avgSentenceLength < 40) return 70;
    if (avgSentenceLength > 100 && avgSentenceLength <= 120) return 70;
    return 50;
  }

  /**
   * SEOを評価
   */
  private evaluateSEO(content: string, keywords: string[]): SEOScore {
    const keywordOccurrences = new Map<string, number>();
    let totalOccurrences = 0;

    // キーワード出現回数をカウント
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex) || [];
      keywordOccurrences.set(keyword, matches.length);
      totalOccurrences += matches.length;
    });

    // キーワード密度（%）
    const words = content.split(/\s+/).length;
    const keywordDensityPercent = words > 0 ? (totalOccurrences / words) * 100 : 0;

    // メタディスクリプション（H1の次の段落を想定）
    const hasMetaDescription = true; // TODO: 実装
    const metaDescriptionLength = 150; // TODO: 実装

    // 内部リンク数
    const internalLinkCount = (content.match(/\[.+?\]\(#.+?\)/g) || []).length;

    // スコア計算
    const keywordDensity = this.scoreKeywordDensity(keywordDensityPercent);
    const metaDescription = this.scoreMetaDescription(hasMetaDescription, metaDescriptionLength);
    const internalLinks = this.scoreInternalLinks(internalLinkCount);

    const score = Math.round((keywordDensity + metaDescription + internalLinks) / 3);

    return {
      score,
      keywordDensity,
      metaDescription,
      internalLinks,
      details: {
        targetKeywords: keywords,
        keywordOccurrences,
        keywordDensityPercent,
        hasMetaDescription,
        metaDescriptionLength,
        internalLinkCount
      }
    };
  }

  /**
   * キーワード密度をスコアリング
   */
  private scoreKeywordDensity(densityPercent: number): number {
    // 理想: 1-3%
    if (densityPercent >= 1 && densityPercent <= 3) return 100;
    if (densityPercent >= 0.5 && densityPercent < 1) return 80;
    if (densityPercent > 3 && densityPercent <= 5) return 80;
    if (densityPercent > 0 && densityPercent < 0.5) return 60;
    if (densityPercent > 5) return 40; // キーワードスタッフィング
    return 50; // キーワードなし
  }

  /**
   * メタディスクリプションをスコアリング
   */
  private scoreMetaDescription(hasDescription: boolean, length: number): number {
    if (!hasDescription) return 40;

    // 理想: 120-160文字
    if (length >= 120 && length <= 160) return 100;
    if (length >= 100 && length < 120) return 85;
    if (length > 160 && length <= 200) return 85;
    return 70;
  }

  /**
   * 内部リンクをスコアリング
   */
  private scoreInternalLinks(count: number): number {
    // 理想: 3-5個
    if (count >= 3 && count <= 5) return 100;
    if (count >= 1 && count < 3) return 80;
    if (count > 5 && count <= 8) return 80;
    if (count > 8) return 60;
    return 50; // 内部リンクなし
  }

  /**
   * リンクを評価
   */
  private async evaluateLinks(content: string): Promise<LinksScore> {
    // リンクを抽出
    const linkMatches = content.match(/\[.+?\]\((.+?)\)/g) || [];
    const links = linkMatches.map(match => {
      const urlMatch = match.match(/\((.+?)\)/);
      return urlMatch ? urlMatch[1] : '';
    }).filter(url => url);

    const totalLinks = links.length;
    const externalLinks = links.filter(url => url.startsWith('http')).length;
    const internalLinks = links.filter(url => url.startsWith('#')).length;

    // TODO: 実際のリンク検証実装（TestAgent連携）
    const validLinks = totalLinks; // スタブ: 全て有効と仮定
    const brokenLinks = 0;

    // スコア計算
    const validity = this.scoreLinkValidity(validLinks, totalLinks);
    const relevance = 80; // TODO: 実際の関連性評価

    const score = Math.round((validity + relevance) / 2);

    return {
      score,
      validity,
      relevance,
      details: {
        totalLinks,
        validLinks,
        brokenLinks,
        externalLinks,
        internalLinks
      }
    };
  }

  /**
   * リンク有効性をスコアリング
   */
  private scoreLinkValidity(validLinks: number, totalLinks: number): number {
    if (totalLinks === 0) return 80; // リンクなしでも80点

    const validityPercent = (validLinks / totalLinks) * 100;

    if (validityPercent === 100) return 100;
    if (validityPercent >= 95) return 90;
    if (validityPercent >= 90) return 80;
    if (validityPercent >= 80) return 70;
    return 50;
  }

  /**
   * フィードバックを生成
   */
  private generateFeedback(score: ArticleQualityScore): string[] {
    const feedback: string[] = [];

    // 構造に関するフィードバック
    if (score.structure.score < 80) {
      if (score.structure.details.h2Count < 3) {
        feedback.push('見出し（H2）を3-6個追加することを推奨します');
      }
      if (score.structure.details.avgParagraphLength < 150) {
        feedback.push('段落を150-300文字程度に拡充することを推奨します');
      }
      if (score.structure.details.listCount === 0) {
        feedback.push('箇条書きリストを追加して可読性を向上させましょう');
      }
    }

    // コンテンツに関するフィードバック
    if (score.content.score < 80) {
      if (score.content.details.totalWords < 2000) {
        feedback.push(`文字数を増やしましょう（現在: ${score.content.details.totalWords}文字、推奨: 2000文字以上）`);
      }
      if (score.content.readability < 80) {
        feedback.push('1文を50-80文字程度にして読みやすさを向上させましょう');
      }
    }

    // SEOに関するフィードバック
    if (score.seo.score < 80) {
      if (score.seo.details.keywordDensityPercent < 1) {
        feedback.push('SEOキーワードの出現頻度を増やしましょう（推奨: 1-3%）');
      }
      if (score.seo.details.internalLinkCount < 3) {
        feedback.push('内部リンクを3-5個追加しましょう');
      }
    }

    // リンクに関するフィードバック
    if (score.links.score < 80) {
      if (score.links.details.brokenLinks > 0) {
        feedback.push(`壊れたリンクを修正しましょう（${score.links.details.brokenLinks}件）`);
      }
    }

    // 総合スコアが低い場合
    if (!score.passed) {
      feedback.push(`総合スコアが合格ライン（${score.threshold}点）に達していません。上記の改善提案を実施してください。`);
    }

    return feedback;
  }
}
