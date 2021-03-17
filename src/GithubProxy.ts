import { Octokit } from "@octokit/core"
import ora from "ora"

export class GithubProxy {
    octokit: Octokit
    owner: string
    repo: string
    constructor(params: GithubProxyConstructorParams) {
        const {owner, repo} = params;
        this.owner = owner;
        this.repo = repo;
        this.octokit = new Octokit({
            auth: params.auth,
        })
    }

    async getCommits() {
        const { data } = await this.octokit.request("GET /repos/{owner}/{repo}/commits", {
            owner: this.owner,
            repo: this.repo,
        })
        return data
    }

    async getRecentCommit() {
        const commits = await this.getCommits()
        return commits[0]
    }

    async downloadZip(commitHash: string): Promise<ArrayBuffer> {
        const spinner = ora("downloading repository")
        spinner.start();

        const { data } = await this.octokit.request("GET /repos/{owner}/{repo}/zipball/{ref}", {
            owner: this.owner,
            repo: this.repo,
            ref: commitHash,
        })

        spinner.stop()

        return data as ArrayBuffer
    }
}

type GithubProxyConstructorParams = {
    auth: string
    owner: string
    repo: string
}