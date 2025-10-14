import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

export interface ProjectConfig {
  owner: string;
  repo: string;
  projectNumber: number;
}

export class ProjectsV2Client {
  private octokit: Octokit;
  private graphqlClient: typeof graphql;
  private config: ProjectConfig;
  private projectId: string | null = null;
  private statusFieldId: string | null = null;

  constructor(token: string, config: ProjectConfig) {
    this.octokit = new Octokit({ auth: token });
    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { owner, projectNumber } = this.config;

    // Get project ID
    const projectQuery = `
      query($owner: String!, $projectNumber: Int!) {
        user(login: $owner) {
          projectV2(number: $projectNumber) {
            id
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;

    const result: any = await this.graphqlClient(projectQuery, {
      owner,
      projectNumber,
    });

    this.projectId = result.user.projectV2.id;

    // Find status field
    const statusField = result.user.projectV2.fields.nodes.find(
      (field: any) => field.name === 'Status'
    );

    if (statusField) {
      this.statusFieldId = statusField.id;
    }
  }

  async getIssueNodeId(issueNumber: number): Promise<string> {
    const { owner, repo } = this.config;

    const issue = await this.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return issue.data.node_id;
  }

  async addIssueToProject(issueNodeId: string): Promise<string> {
    if (!this.projectId) {
      throw new Error('Project not initialized. Call initialize() first.');
    }

    const mutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item {
            id
          }
        }
      }
    `;

    const result: any = await this.graphqlClient(mutation, {
      projectId: this.projectId,
      contentId: issueNodeId,
    });

    return result.addProjectV2ItemById.item.id;
  }

  async updateStatus(itemId: string, status: string): Promise<void> {
    if (!this.projectId || !this.statusFieldId) {
      throw new Error('Project not initialized. Call initialize() first.');
    }

    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $value }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `;

    await this.graphqlClient(mutation, {
      projectId: this.projectId,
      itemId,
      fieldId: this.statusFieldId,
      value: status,
    });
  }
}
